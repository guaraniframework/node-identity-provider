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
        gender,
        birthdate,
        zoneinfo,
        locale,
        phone_number
    )
VALUES (
        $id,
        $password,
        $given_name,
        $middle_name,
        $family_name,
        $nickname,
        $preferred_username,
        $profile,
        $picture,
        $website,
        $email,
        $gender,
        $birthdate,
        $zoneinfo,
        $locale,
        $phone_number
    ) RETURNING *;