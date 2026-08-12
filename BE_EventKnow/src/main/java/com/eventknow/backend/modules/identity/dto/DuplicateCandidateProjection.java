package com.eventknow.backend.modules.identity.dto;

import java.util.UUID;

public interface DuplicateCandidateProjection {
    UUID getIdA();

    String getNameA();

    UUID getIdB();

    String getNameB();

    Double getScore();

    String getMatchReason();
}
