-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email
CREATE INDEX idx_users_email ON users(email);

-- Create api_tokens table
CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    rate_limit INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

-- Create indexes on api_tokens
CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX idx_api_tokens_is_active ON api_tokens(is_active);

-- Create usage_logs table
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES api_tokens(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    model_id VARCHAR(255),
    request_duration_ms INTEGER NOT NULL,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on usage_logs for performance
CREATE INDEX idx_usage_logs_token_id ON usage_logs(token_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_endpoint ON usage_logs(endpoint);
CREATE INDEX idx_usage_logs_model_id ON usage_logs(model_id);
CREATE INDEX idx_usage_logs_status_code ON usage_logs(status_code);

-- Create composite index for common queries
CREATE INDEX idx_usage_logs_token_date ON usage_logs(token_id, created_at DESC);

-- Create ntth_tokens_cache table for caching NTTH authentication tokens
CREATE TABLE IF NOT EXISTS ntth_tokens_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_tokens_updated_at BEFORE UPDATE ON api_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for usage statistics
CREATE OR REPLACE VIEW usage_statistics AS
SELECT
    t.id AS token_id,
    t.name AS token_name,
    u.name AS user_name,
    u.email AS user_email,
    COUNT(ul.id) AS total_requests,
    SUM(CASE WHEN ul.status_code >= 200 AND ul.status_code < 300 THEN 1 ELSE 0 END) AS successful_requests,
    SUM(CASE WHEN ul.status_code >= 400 THEN 1 ELSE 0 END) AS failed_requests,
    COALESCE(SUM(ul.total_tokens), 0) AS total_tokens_used,
    COALESCE(AVG(ul.request_duration_ms), 0) AS avg_duration_ms,
    MAX(ul.created_at) AS last_request_at
FROM api_tokens t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN usage_logs ul ON t.id = ul.token_id
WHERE t.is_active = true
GROUP BY t.id, t.name, u.name, u.email;

-- Insert default admin user
INSERT INTO users (name, email)
VALUES ('Admin User', 'admin@localhost')
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE users IS 'Stores user accounts';
COMMENT ON TABLE api_tokens IS 'Stores API tokens for authentication';
COMMENT ON TABLE usage_logs IS 'Stores API usage logs for analytics';
COMMENT ON TABLE ntth_tokens_cache IS 'Caches NTTH authentication tokens';
COMMENT ON VIEW usage_statistics IS 'Aggregated usage statistics per token';
