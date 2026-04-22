CREATE TABLE IF NOT EXISTS driver_daily_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    plan_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, date)
);
ALTER TABLE driver_daily_records DISABLE ROW LEVEL SECURITY;
GRANT ALL ON driver_daily_records TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE driver_daily_records;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount NUMERIC(12, 2) NOT NULL,
    allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON payment_transactions TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE allocation_type_enum AS ENUM ('debt', 'current', 'credit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    daily_record_id UUID REFERENCES driver_daily_records(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    allocation_type allocation_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE payment_allocations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON payment_allocations TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE payment_allocations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS driver_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE driver_credits DISABLE ROW LEVEL SECURITY;
GRANT ALL ON driver_credits TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE driver_credits;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION allocate_payment(
  p_driver_id UUID,
  p_amount NUMERIC,
  p_received_at TIMESTAMP WITH TIME ZONE,
  p_created_by UUID
) RETURNS JSON AS $$
DECLARE
  v_remaining NUMERIC := p_amount;
  v_tx_id UUID;
  v_daily_rec_id UUID;
  v_owed NUMERIC;
  v_cover NUMERIC;
  v_day RECORD;
  v_today DATE := p_received_at::DATE;
  v_today_plan NUMERIC;
  v_allocations JSONB := '[]'::JSONB;
BEGIN
  INSERT INTO payment_transactions (driver_id, received_at, total_amount, created_by)
  VALUES (p_driver_id, p_received_at, p_amount, p_created_by)
  RETURNING id INTO v_tx_id;

  FOR v_day IN
    SELECT id, date, plan_amount, paid_amount
    FROM driver_daily_records
    WHERE driver_id = p_driver_id 
      AND date < v_today
      AND paid_amount < plan_amount
    ORDER BY date ASC
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    v_owed := v_day.plan_amount - v_day.paid_amount;
    v_cover := LEAST(v_remaining, v_owed);

    INSERT INTO payment_allocations (transaction_id, daily_record_id, amount, allocation_type)
    VALUES (v_tx_id, v_day.id, v_cover, 'debt');

    UPDATE driver_daily_records 
    SET paid_amount = paid_amount + v_cover
    WHERE id = v_day.id;

    v_allocations := v_allocations || jsonb_build_object(
      'daily_record_id', v_day.id,
      'amount', v_cover,
      'type', 'debt'
    );

    v_remaining := v_remaining - v_cover;
  END LOOP;

  IF v_remaining > 0 THEN
    SELECT id, plan_amount, paid_amount INTO v_day
    FROM driver_daily_records
    WHERE driver_id = p_driver_id AND date = v_today;

    IF NOT FOUND THEN
      SELECT COALESCE(
        (SELECT daily_plan FROM cars WHERE assigned_driver_id = p_driver_id AND is_deleted = FALSE LIMIT 1),
        daily_plan
      ) INTO v_today_plan
      FROM drivers WHERE id = p_driver_id;

      INSERT INTO driver_daily_records (driver_id, date, plan_amount, paid_amount)
      VALUES (p_driver_id, v_today, COALESCE(v_today_plan, 0), 0)
      RETURNING id, plan_amount, paid_amount INTO v_day;
    END IF;

    v_owed := v_day.plan_amount - v_day.paid_amount;
    v_cover := LEAST(v_remaining, v_owed);

    IF v_cover > 0 THEN
      INSERT INTO payment_allocations (transaction_id, daily_record_id, amount, allocation_type)
      VALUES (v_tx_id, v_day.id, v_cover, 'current');

      UPDATE driver_daily_records 
      SET paid_amount = paid_amount + v_cover
      WHERE id = v_day.id;

      v_allocations := v_allocations || jsonb_build_object(
        'daily_record_id', v_day.id,
        'amount', v_cover,
        'type', 'current'
      );

      v_remaining := v_remaining - v_cover;
    END IF;
  END IF;

  IF v_remaining > 0 THEN
    INSERT INTO payment_allocations (transaction_id, daily_record_id, amount, allocation_type)
    VALUES (v_tx_id, NULL, v_remaining, 'credit');

    INSERT INTO driver_credits (driver_id, balance)
    VALUES (p_driver_id, v_remaining)
    ON CONFLICT (driver_id) DO UPDATE 
    SET balance = driver_credits.balance + v_remaining, updated_at = NOW();

    v_allocations := v_allocations || jsonb_build_object(
      'daily_record_id', NULL,
      'amount', v_remaining,
      'type', 'credit'
    );
  END IF;

  UPDATE payment_transactions
  SET allocated_amount = p_amount
  WHERE id = v_tx_id;

  RETURN json_build_object(
    'transaction_id', v_tx_id,
    'allocations', v_allocations,
    'driver_credit_balance', COALESCE((SELECT balance FROM driver_credits WHERE driver_id = p_driver_id), 0)
  );
END;
$$ LANGUAGE plpgsql;
