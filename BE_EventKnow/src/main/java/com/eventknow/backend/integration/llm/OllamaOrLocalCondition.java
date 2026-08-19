package com.eventknow.backend.integration.llm;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

public class OllamaOrLocalCondition implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String provider = context.getEnvironment().getProperty("ai.provider", "gemini");
        return "ollama".equalsIgnoreCase(provider) || "local".equalsIgnoreCase(provider);
    }
}
