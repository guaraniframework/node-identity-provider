UPDATE grants
SET
    interactions = $interactions,
    consent_id = $consent_id
WHERE
    id = $id;