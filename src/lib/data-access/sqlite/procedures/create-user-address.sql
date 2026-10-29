INSERT INTO
    user_addresses (
        id,
        street_address,
        locality,
        region,
        postal_code,
        country,
        user_id
    )
VALUES (
        $id,
        $street_address,
        $locality,
        $region,
        $postal_code,
        $country,
        $user_id
    ) RETURNING *;