package com.chatly.security;

import lombok.RequiredArgsConstructor;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class WebSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final McpSecurityInterceptor mcpSecurityInterceptor;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    /**
     * Only these auth routes are anonymous. Do not use {@code /api/auth/**} — that would leave
     * {@code /api/auth/change-password} and {@code /api/auth/sessions/**} effectively unauthenticated.
     */
    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/logout",
            "/api/auth/forgot-password",
            "/api/auth/resend-verification",
            "/api/auth/introspect",
            "/api/auth/verify-email",
            "/api/auth/qr/generate",
            "/api/auth/qr/status/**",
            "/ws",
            "/ws/**",
            "/ws-raw",
            "/ws-raw/**",
            "/ws-test.html",
            "/chatroom-test.html",
            "/",
            "/api/health",
            "/actuator/health",
            "/uploads/**"
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // .cors(Customizer.withDefaults())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR, DispatcherType.ASYNC).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/posts/**").authenticated()
                        .requestMatchers("/api/reels/**").authenticated()
                        .requestMatchers("/api/files/**").authenticated()
                        .requestMatchers("/api/ai/**").authenticated()
                        .requestMatchers("/api/reports/**").authenticated()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized")))
                .addFilterBefore(mcpSecurityInterceptor, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        // WebSocket endpoints: auth is JWT-based (query param), not cookie-based.
        // Native mobile clients (okhttp) send Origin: http://localhost which does not match
        // the web allowed origins, so we permit any origin here and rely on the
        // WebSocketAuthInterceptor to validate the token.
        CorsConfiguration wsConfig = new CorsConfiguration();
        wsConfig.setAllowedOriginPatterns(List.of("*"));
        wsConfig.setAllowedMethods(List.of("GET"));
        wsConfig.setAllowedHeaders(List.of("*"));

        // REST API endpoints: strict origin list from config.
        CorsConfiguration apiConfig = new CorsConfiguration();
        apiConfig.setAllowedOriginPatterns(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .collect(Collectors.toList()));
        apiConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        apiConfig.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "X-API-Key",
            "X-Internal-API-Key",
            "X-User-Id",
            "X-Client-Platform",
            "X-Device-Label"
        ));
        apiConfig.setAllowCredentials(true);
        apiConfig.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // WebSocket paths must be registered first (UrlBasedCorsConfigurationSource
        // returns the first matching pattern in insertion order).
        source.registerCorsConfiguration("/ws", wsConfig);
        source.registerCorsConfiguration("/ws/**", wsConfig);
        source.registerCorsConfiguration("/ws-raw", wsConfig);
        source.registerCorsConfiguration("/ws-raw/**", wsConfig);
        source.registerCorsConfiguration("/**", apiConfig);
        return source;
    }

    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(JwtAuthenticationFilter filter) {
        FilterRegistrationBean<JwtAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<McpSecurityInterceptor> mcpFilterRegistration(McpSecurityInterceptor filter) {
        FilterRegistrationBean<McpSecurityInterceptor> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}
