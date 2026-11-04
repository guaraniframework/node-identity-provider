INSERT OR IGNORE INTO
    clients (
        id,
        name,
        type,
        profile,
        redirect_uris,
        response_types,
        grant_types,
        authentication_method,
        client_uri,
        logo_uri,
        policy_uri,
        tos_uri,
        jwks_uri,
        jwks,
        sector_identifier_uri,
        subject_type,
        id_token_signed_response_alg,
        id_token_encrypted_response_alg,
        id_token_encrypted_response_enc,
        authentication_signing_alg,
        jwt_bearer_grant_signing_alg,
        default_max_age,
        require_auth_time,
        default_acr_values,
        software_id,
        software_version
    )
VALUES (
        X'b1eeace92b0c468ea444733befc3b35d',
        'Dev Client #1',
        'public',
        'web',
        '["https://localhost:4000/oidc/callback"]',
        '["code","code id_token","code id_token token","code token","id_token","id_token token","none","token"]',
        '["authorization_code","client_credentials","password","refresh_token","urn:ietf:params:oauth:grant-type:device_code","urn:ietf:params:oauth:grant-type:jwt-bearer"]',
        'client_secret_basic',
        'https://localhost:4000/about',
        'https://localhost:4000/logo.png',
        'https://localhost:4000/policy',
        'https://localhost:4000/terms-of-service',
        NULL,
        '{"keys":[{"kty":"EC","crv":"P-256","x":"50yLdrKNc8l-4L1Z38UjfJbeMxhX6HNiK9UEPwxRO0Q","y":"9eM_cPxcQtnnu2GfifT4U6wZrBvnQog3p8bkR-lO-Pk","d":"aHNgm4WOEyC1vv7z7_yQEswdQOaSizAgbJQ1t9NsTBc","alg":"ES256","use":"sig","kid":"24ee80ab-06b8-4934-8fd6-928277d0a777"},{"kty":"RSA","n":"sPbChsJMPMZIa0FEyRywhMww65f8oXdB8AwHy_YDvPJ-mKiaEruXFe17fQpiOQD-BNkwuk_-iQxMKTsEVi6AwO1v99dE18GHoGEBVGu-0nAScaGRGxRSqjBdo_qccnH2onBz43Zku22Y3KJnjPXoGLhGpYnNnffymqzsb0Ry6jsJPYN-3MP90LYcHLe4BoWvPay7fVL1UPK1QQCV_joua8K_FVle5qfFpFVBGaZA1re-Qy7xWk5h4y9DwIBkKbJiMJSsFQGyems-mGV6jNcKecti4XuOGcw5AJXMdQKWek_d3zOYXzI_TGZDLn9RKQQ6Z0bwjPQaEYRdQ1fio3Nmpw","e":"AQAB","d":"GTWN0JStN5snhd_uZJfprYFJFsa3_mh2xDNyiOOq9Ke20RhzmmeOxljmVpG8HFK_3QDzqBbtM6jE0LrPi1dkkBdC9BN-gx3WrEolXlla_a9pcTaK7Uif3g61yD5TOxpxAAL0_1pGT0z1kbiw96uwPJVDuyE-YVqI_O_VXqRpmmRBro1VQsAKYHalWQVR7jLT_Id-0D_bC2sXrPqpLgjURgW41UjZJTRz1I6xsjKAJU4sEoig3NUg8-_aGS8vm9CQ4wMhspcuUYPIqd40w-QQqN9L2FBu63R_Flx1r9f0olI4y6XS1ktAx6yvTZ02rCiR7rpNSC-QXLYIeceVOd51wQ","p":"6V5_3DjA58plfytj1dAz2ZloCq3fp1mm-GQhe098yl-vpdOPi3Jagt2SXVfm9Ckmhb-K097c-MMu8jOIJd10w6mVVbuQhKiFDBVgwUpaphyrCswiKc-m-cPjmEGtZ9UgO1_AVHjZfcsdYau56ZTPphToA-XFa7uaYWUtDp55ycs","q":"wh_5OHcdtUU-r2DpaQaWN38ZmnEo2WSXVYobQs62TszXrpAOT6s1ins67kMO3Xb9xOOYLSB2E_tYVpFSYYiPwKZ51Wy44v9AE91tnjhfT5ulltUtUfnDjzovkfibedNIxsBroQRzw2YnIGfidnVLqkcRKLDrwmZpEugJgwiaaxU","dp":"4cql6TwcIOhp9XXU3X3ZfPL5gEOkvnV2oKO45WcN9XxJJSehnikhO7cHszqmYZwjAotF1iKuKB4pIPwNAZ3YKKu-qjmU5VVrjTpt5_Z56HiaYRMLBus7wjLu1VTOY0UJL4lAPDrFK_nGzsZpVX--vRFDPuokbk0QXKWYx6k7aqs","dq":"cpcpKFm4Ia70Z9ZPMf3_YlcWqAIwWNN2ObpCiVc4ap-kmZjTudeYzVwc11SiS7zX5AdtZwYIbZcq-D7kYEqagOBEfuWk5epCyvckpAcmy_lW8Ah6ri8_byarugEE1g8QoLIpVm0oYKnGYuyv07k9pxA4Ysq9AI4vbEeohb7oWFk","qi":"xm6UShKAoz0drmZQP5LhuoRjGO8x9Z0qd-0JPCyRb9NAEPTGCyF3eh0Fv1Np6kryQ3AgYH1xrGvBKnoLbR_Hf_mji2E98Rj1evXzASve8B3G4VauvfxBMp7J0yuWnhUgp45yDP2xM2biYMAmSnDKfqcn-eYScIy15qNmRffO_Jw","alg":"RSA-OAEP","use":"enc","kid":"d2e9019d-0043-48e0-bc02-98c781e88798"}]}',
        'https://localhost:4000/sector-identifier',
        'public',
        'ES256',
        'RSA-OAEP',
        'A128GCM',
        'ES256',
        'ES256',
        7776000,
        1,
        '["urn:guarani:acr:1fa","urn:guarani:acr:2fa"]',
        '6d05a3c4-a2f2-4867-8d2f-f7f6675bd127',
        '1.0'
    );

INSERT OR IGNORE INTO
    client_secrets (
        id,
        secret,
        expires_at,
        client_id
    )
VALUES (
        X'90bf5d4d61814cd2ba36fad3fcf0b19e',
        X'cfd2325743ddebffb45d124fe4337e52f15878fe7ab1b357',
        unixepoch('now', '+120 days'),
        X'b1eeace92b0c468ea444733befc3b35d'
    );

INSERT OR IGNORE INTO
    client_scopes (client_id, scope_id)
VALUES (
        X'b1eeace92b0c468ea444733befc3b35d',
        X'3c0e3cb6db26406fa082bf591aad8099'
    ),
    (
        X'b1eeace92b0c468ea444733befc3b35d',
        X'1635b570cddc47fb8d849c37f639ffe5'
    ),
    (
        X'b1eeace92b0c468ea444733befc3b35d',
        X'4c6899e307ae4d3d89d387cd0b65a262'
    ),
    (
        X'b1eeace92b0c468ea444733befc3b35d',
        X'ba8b75e0bd77449aa45099d70f8278bb'
    ),
    (
        X'b1eeace92b0c468ea444733befc3b35d',
        X'dda525aef8f4436bae08f1e30abe54cf'
    ),
    (
        X'b1eeace92b0c468ea444733befc3b35d',
        X'ad6794ed66a14f64807468d20f16297e'
    ),
    (
        X'b1eeace92b0c468ea444733befc3b35d',
        X'be6999c0811b4791b7a835f705862250'
    ),
    (
        X'b1eeace92b0c468ea444733befc3b35d',
        X'3a9c4d0af4a94dd4859fcafd3fd229a2'
    ),
    (
        X'b1eeace92b0c468ea444733befc3b35d',
        X'1f08abf55f7142a6b8ee83eefe39162b'
    ),
    (
        X'b1eeace92b0c468ea444733befc3b35d',
        X'c0d65a3e49834880869d56ec19c61846'
    );
