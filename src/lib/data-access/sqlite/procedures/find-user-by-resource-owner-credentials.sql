SELECT
    u.id,
    u.password,
    u.given_name,
    u.middle_name,
    u.family_name,
    u.nickname,
    u.preferred_username,
    u.profile,
    u.picture,
    u.website,
    u.email,
    u.email_verified,
    u.gender,
    u.birthdate,
    u.zoneinfo,
    u.locale,
    u.phone_number,
    u.phone_number_verified,
    a.id as address_id,
    a.street_address,
    a.locality,
    a.region,
    a.postal_code,
    a.country,
    u.created_at,
    u.updated_at
FROM users u
    JOIN user_addresses a ON u.id = a.user_id
WHERE
    u.email = $email
    AND u.password = $password;