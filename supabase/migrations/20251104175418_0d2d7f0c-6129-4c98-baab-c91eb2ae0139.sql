-- Create role enum
CREATE TYPE public.user_role AS ENUM ('customer', 'dispatcher', 'admin');

-- Create parcel status enum
CREATE TYPE public.parcel_status AS ENUM ('created', 'paid', 'shipped', 'delivered');

-- Create parcel type enum
CREATE TYPE public.parcel_type AS ENUM ('document', 'small_package', 'medium_package', 'large_package', 'fragile');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table (proper role management)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create parcels table
CREATE TABLE public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_pincode TEXT NOT NULL,
  to_pincode TEXT NOT NULL,
  parcel_type public.parcel_type NOT NULL,
  weight DECIMAL(10,2),
  description TEXT,
  cost DECIMAL(10,2) NOT NULL,
  status public.parcel_status NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create dispatcher_pincodes table
CREATE TABLE public.dispatcher_pincodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatcher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pincode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(dispatcher_id, pincode)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatcher_pincodes ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for parcels
CREATE POLICY "Customers can view their own parcels"
  ON public.parcels FOR SELECT
  USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can create parcels"
  ON public.parcels FOR INSERT
  WITH CHECK (auth.uid() = customer_id AND public.has_role(auth.uid(), 'customer'));

CREATE POLICY "Dispatchers can view relevant parcels"
  ON public.parcels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dispatcher_pincodes
      WHERE dispatcher_id = auth.uid()
      AND (pincode = from_pincode OR pincode = to_pincode)
    )
  );

CREATE POLICY "Dispatchers can update relevant parcels"
  ON public.parcels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dispatcher_pincodes
      WHERE dispatcher_id = auth.uid()
      AND (pincode = from_pincode OR pincode = to_pincode)
    )
  );

CREATE POLICY "Admins can manage all parcels"
  ON public.parcels FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for dispatcher_pincodes
CREATE POLICY "Dispatchers can view their pincodes"
  ON public.dispatcher_pincodes FOR SELECT
  USING (auth.uid() = dispatcher_id);

CREATE POLICY "Admins can manage dispatcher pincodes"
  ON public.dispatcher_pincodes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parcels_updated_at
  BEFORE UPDATE ON public.parcels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate unique tracking code
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'GCS' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();