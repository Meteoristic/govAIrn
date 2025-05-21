-- SQL script to add StakeDAO to the database
-- Run this in the Supabase SQL Editor: https://app.supabase.com/project/<your-project-id>/sql

-- First check if the DAO already exists
DO $$
DECLARE
    dao_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.daos WHERE id = 'stakedao.eth'
    ) INTO dao_exists;
    
    IF dao_exists THEN
        -- Update existing DAO
        UPDATE public.daos
        SET
            name = 'Stake DAO',
            description = 'The Liquid Lockers Protocol. Stake DAO is a non-custodial liquid staking platform focused on governance tokens.',
            platform = 'Ethereum',
            logo_url = 'ipfs://QmV71VYHbeSGjTphMx95hUSRawsMVei4RH6WAFS1LTFZMF',
            governance_url = 'https://snapshot.org/#/stakedao.eth',
            is_base_ecosystem = false,
            updated_at = NOW()
        WHERE id = 'stakedao.eth';
        
        RAISE NOTICE 'StakeDAO updated successfully';
    ELSE
        -- Insert new DAO
        INSERT INTO public.daos (
            id,
            name,
            description,
            platform,
            logo_url,
            governance_url,
            is_base_ecosystem,
            created_at,
            updated_at
        ) VALUES (
            'stakedao.eth',
            'Stake DAO',
            'The Liquid Lockers Protocol. Stake DAO is a non-custodial liquid staking platform focused on governance tokens.',
            'Ethereum',
            'ipfs://QmV71VYHbeSGjTphMx95hUSRawsMVei4RH6WAFS1LTFZMF',
            'https://snapshot.org/#/stakedao.eth',
            false,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'StakeDAO added successfully';
    END IF;
END $$; 