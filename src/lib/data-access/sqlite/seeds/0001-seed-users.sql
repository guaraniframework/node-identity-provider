INSERT INTO
    users (
        id,
        password,
        given_name,
        middle_name,
        family_name,
        nickname,
        preferred_username,
        profile,
        picture,
        website,
        email,
        email_verified,
        gender,
        birthdate,
        zoneinfo,
        locale,
        phone_number,
        phone_number_verified
    )
VALUES (
        X'16907c32687b493c85baf41f2c9d4daa',
        'ldMBaaWcQYtSATMV_IG8mf3wp7A6EW80arYoSW80ntU',
        'John',
        NULL,
        'Doe',
        'johnny',
        'j.doe',
        'https://provider.example.com/users/16907c32-687b-493c-85ba-f41f2c9d4daa',
        'https://provider.example.com/users/16907c32-687b-493c-85ba-f41f2c9d4daa/picture.jpg',
        'https://johndoe.example.org',
        'john.doe@email.com',
        1,
        'male',
        '1996-03-14',
        'America/Sao_Paulo',
        'pt-BR',
        '+55 (11) 98765-4321',
        1
    );

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
        X'59ad24975d174110865629b581af7d01',
        'Av. Paulista, 1578 - Bela Vista',
        'Sao Paulo',
        'SP',
        '01310-200',
        'Brazil',
        X'16907c32687b493c85baf41f2c9d4daa'
    );