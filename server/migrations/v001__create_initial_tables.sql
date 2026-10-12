-- =========================
-- USER
-- =========================
CREATE TABLE app_user (
    user_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    created_date    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    logged_in_last  TIMESTAMPTZ,
    verified        BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT uq_user_email UNIQUE (email)
);


-- =========================
-- POD
-- =========================
CREATE TABLE pod (
    pod_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_date    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- POD MEMBER
-- =========================
CREATE TABLE pod_member (
    pod_member_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pod_id          BIGINT NOT NULL,
    user_id         BIGINT,
    temporary_name  VARCHAR(100),
    created_date    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pod_member_pod
        FOREIGN KEY (pod_id)
        REFERENCES pod(pod_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_pod_member_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(user_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_pod_member_identity
        CHECK (
            user_id IS NOT NULL
            OR (
                temporary_name IS NOT NULL
                AND LENGTH(TRIM(temporary_name)) > 0
            )
        ),

    CONSTRAINT uq_pod_member_user
        UNIQUE (pod_id, user_id)
);


-- =========================
-- POD ADMIN
-- =========================
CREATE TABLE pod_user_admin (
    pod_id          BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (pod_id, user_id),

    CONSTRAINT fk_pod_admin_pod
        FOREIGN KEY (pod_id)
        REFERENCES pod(pod_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_pod_admin_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(user_id)
        ON DELETE CASCADE
);


-- =========================
-- GAME
-- =========================
CREATE TABLE game (
    game_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date_played     TIMESTAMPTZ,
    date_created    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pod_id          BIGINT NOT NULL,

    CONSTRAINT fk_game_pod
        FOREIGN KEY (pod_id)
        REFERENCES pod(pod_id)
        ON DELETE CASCADE
);


-- =========================
-- POD GAME PLAYER
-- =========================
CREATE TABLE pod_game_player (
    pod_game_player_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pod_member_id      BIGINT NOT NULL,
    game_id            BIGINT NOT NULL,

    main_card           VARCHAR(255),
    secondary_card      VARCHAR(255),
    color_schema        VARCHAR(50),

    date_created        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_game_player_member
        FOREIGN KEY (pod_member_id)
        REFERENCES pod_member(pod_member_id),

    CONSTRAINT fk_game_player_game
        FOREIGN KEY (game_id)
        REFERENCES game(game_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_game_player
        UNIQUE (game_id, pod_member_id),

    -- Allows game_result to verify that the winner
    -- actually belongs to the referenced game.
    CONSTRAINT uq_game_player_game
        UNIQUE (pod_game_player_id, game_id)
);


-- =========================
-- GAME RESULT
-- =========================
CREATE TABLE game_result (
    game_result_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    game_id         BIGINT NOT NULL,
    player_winner   BIGINT,

    CONSTRAINT uq_game_result_game
        UNIQUE (game_id),

    CONSTRAINT fk_game_result_game
        FOREIGN KEY (game_id)
        REFERENCES game(game_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_game_result_winner
        FOREIGN KEY (player_winner, game_id)
        REFERENCES pod_game_player(pod_game_player_id, game_id)
);
