BEGIN TRANSACTION;

DELETE FROM logins_clients
WHERE
    login_id = $login_id
    AND client_id NOT IN ($clients_ids);

INSERT OR IGNORE INTO
    logins_clients (login_id, client_id)
VALUES
    $logins_clients;

COMMIT;