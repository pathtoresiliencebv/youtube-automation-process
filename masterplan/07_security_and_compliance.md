# Content Catalyst Engine - Security and Compliance

## Security Framework Overview

### Security Architecture Philosophy
The Content Catalyst Engine implements a "Security by Design" approach, incorporating security considerations at every layer of the application architecture. Our security model follows the principle of "Zero Trust" - never trust, always verify.

### Security Objectives
1. **Data Protection**: Safeguard user data and intellectual property
2. **Access Control**: Ensure proper authentication and authorization
3. **API Security**: Protect against common API vulnerabilities
4. **Privacy Compliance**: Meet GDPR and Dutch privacy regulations
5. **Incident Response**: Rapid detection and response to security threats

## Authentication and Authorization

### Multi-Factor Authentication (MFA)
```typescript
interface MFAConfiguration {
  enabled: boolean;
  methods: ('totp' | 'sms' | 'email')[];
  backup_codes: string[];
  recovery_options: {
    email_recovery: boolean;
    admin_reset: boolean;
  };
}

// MFA Implementation
export class MFAService {
  async enableTOTP(userId: string): Promise<{
    secret: string;
    qr_code: string;
    backup_codes: string[];
  }> {
    const secret = speakeasy.generateSecret({
      name: `Content Catalyst Engine (${userEmail})`,
      issuer: 'Content Catalyst Engine'
    });
    
    // Store encrypted secret
    await this.storeMFASecret(userId, secret.base32);
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    await this.storeBackupCodes(userId, backupCodes);
    
    return {
      secret: secret.base32,
      qr_code: secret.otpauth_url,
      backup_codes: backupCodes
    };
  }
  
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const secret = await this.getMFASecret(userId);
    
    return speakeasy.totp.verify({
      secret,
      token,
      window: 2, // Allow 60 seconds drift
      time: Date.now() / 1000
    });
  }
}
```

### OAuth 2.0 Security Implementation
```typescript
interface YouTubeOAuthConfig {
  client_id: string;
  client_secret: string; // Stored in secure environment
  redirect_uris: string[];
  scopes: string[];
  state_verification: boolean;
  pkce_enabled: boolean; // PKCE for additional security
}

export class YouTubeOAuthService {
  async generateAuthURL(userId: string): Promise<{
    auth_url: string;
    state: string;
    code_verifier: string;
  }> {
    // Generate cryptographically secure state parameter
    const state = crypto.randomBytes(32).toString('hex');
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    // Store state and code verifier temporarily
    await this.storeOAuthState(userId, state, codeVerifier);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', this.config.client_id);
    authUrl.searchParams.set('redirect_uri', this.config.redirect_uris[0]);
    authUrl.searchParams.set('scope', this.config.scopes.join(' '));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    
    return {
      auth_url: authUrl.toString(),
      state,
      code_verifier: codeVerifier
    };
  }
  
  async exchangeCodeForTokens(
    code: string,
    state: string,
    userId: string
  ): Promise<YouTubeTokens> {
    // Verify state parameter
    const storedState = await this.verifyOAuthState(userId, state);
    if (!storedState) {
      throw new SecurityError('Invalid OAuth state parameter');
    }
    
    // Exchange authorization code for tokens
    const tokenResponse = await this.exchangeAuthorizationCode(
      code,
      storedState.code_verifier
    );
    
    // Encrypt and store tokens
    await this.storeEncryptedTokens(userId, tokenResponse);
    
    return tokenResponse;
  }
}
```

### Session Management
```typescript
interface SecureSession {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  last_accessed: Date;
  ip_address: string;
  user_agent: string;
  security_flags: {
    mfa_verified: boolean;
    suspicious_activity: boolean;
    trusted_device: boolean;
  };
}

export class SessionManager {
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private readonly ABSOLUTE_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<SecureSession> {
    // Check for suspicious login patterns
    await this.checkSuspiciousActivity(userId, ipAddress);
    
    const session: SecureSession = {
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date(),
      expires_at: new Date(Date.now() + this.SESSION_TIMEOUT),
      last_accessed: new Date(),
      ip_address: ipAddress,
      user_agent: userAgent,
      security_flags: {
        mfa_verified: false,
        suspicious_activity: false,
        trusted_device: await this.isTrustedDevice(userId, userAgent)
      }
    };
    
    await this.storeSession(session);
    return session;
  }
  
  async validateSession(sessionId: string): Promise<SecureSession | null> {
    const session = await this.getSession(sessionId);
    
    if (!session) return null;
    
    // Check if session is expired
    if (session.expires_at < new Date()) {
      await this.deleteSession(sessionId);
      return null;
    }
    
    // Check absolute timeout
    const absoluteExpiry = new Date(
      session.created_at.getTime() + this.ABSOLUTE_TIMEOUT
    );
    if (absoluteExpiry < new Date()) {
      await this.deleteSession(sessionId);
      return null;
    }
    
    // Update last accessed time
    session.last_accessed = new Date();
    session.expires_at = new Date(Date.now() + this.SESSION_TIMEOUT);
    await this.updateSession(session);
    
    return session;
  }
}
```

## Data Protection and Encryption

### Encryption Implementation
```typescript
interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  key_derivation: 'pbkdf2';
  iterations: 100000;
  salt_length: 32;
  iv_length: 16;
  tag_length: 16;
}

export class EncryptionService {
  private readonly config: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    key_derivation: 'pbkdf2',
    iterations: 100000,
    salt_length: 32,
    iv_length: 16,
    tag_length: 16
  };
  
  async encryptSensitiveData(
    plaintext: string,
    masterKey: string
  ): Promise<{
    encrypted: string;
    salt: string;
    iv: string;
    tag: string;
  }> {
    // Generate random salt and IV
    const salt = crypto.randomBytes(this.config.salt_length);
    const iv = crypto.randomBytes(this.config.iv_length);
    
    // Derive encryption key from master key
    const key = crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.config.iterations,
      32, // 256 bits
      'sha256'
    );
    
    // Encrypt data
    const cipher = crypto.createCipher(this.config.algorithm, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    };
  }
  
  async decryptSensitiveData(
    encryptedData: {
      encrypted: string;
      salt: string;
      iv: string;
      tag: string;
    },
    masterKey: string
  ): Promise<string> {
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    
    // Derive decryption key
    const key = crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.config.iterations,
      32,
      'sha256'
    );
    
    // Decrypt data
    const decipher = crypto.createDecipher(this.config.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### Database Security Configuration
```sql
-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_production_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_schedule ENABLE ROW LEVEL SECURITY;

-- User data access policy
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid() = id);

-- Video data access policy  
CREATE POLICY "videos_own_data" ON youtube_videos
  FOR ALL USING (user_id = auth.uid());

-- Content access policy
CREATE POLICY "content_own_data" ON generated_content
  FOR ALL USING (user_id = auth.uid());

-- Admin access policy (for support and debugging)
CREATE POLICY "admin_access" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Audit logging policy
CREATE POLICY "audit_log_access" ON system_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'auditor')
    )
  );

-- Function to anonymize user data (GDPR compliance)
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Anonymize personal information
  UPDATE users SET
    email = 'anonymized_' || p_user_id::text || '@deleted.local',
    full_name = 'Deleted User',
    avatar_url = NULL,
    youtube_access_token = NULL,
    youtube_refresh_token = NULL,
    preferences = '{}',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Remove or anonymize generated content
  UPDATE generated_content SET
    generated_text = '[Content Deleted]',
    prompt_used = '[Prompt Deleted]',
    user_feedback = NULL
  WHERE user_id = p_user_id;
  
  -- Log the anonymization
  INSERT INTO system_logs (
    user_id, event_type, severity, source, message
  ) VALUES (
    p_user_id, 'data_anonymization', 'info', 'gdpr_compliance',
    'User data anonymized for GDPR compliance'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## API Security

### Rate Limiting Implementation
```typescript
interface RateLimitConfig {
  window_ms: number;
  max_requests: number;
  burst_limit: number;
  skip_successful: boolean;
  key_generator: (req: Request) => string;
}

export class RateLimitService {
  private readonly limits: Map<string, RateLimitConfig> = new Map([
    ['auth', {
      window_ms: 15 * 60 * 1000, // 15 minutes
      max_requests: 5,
      burst_limit: 10,
      skip_successful: false,
      key_generator: (req) => req.ip
    }],
    ['api_generate', {
      window_ms: 60 * 1000, // 1 minute
      max_requests: 10,
      burst_limit: 15,
      skip_successful: true,
      key_generator: (req) => req.user?.id || req.ip
    }],
    ['api_upload', {
      window_ms: 60 * 1000, // 1 minute
      max_requests: 5,
      burst_limit: 8,
      skip_successful: true,
      key_generator: (req) => req.user?.id || req.ip
    }]
  ]);
  
  async checkRateLimit(
    category: string,
    req: Request
  ): Promise<{
    allowed: boolean;
    remaining: number;
    reset_time: Date;
    retry_after?: number;
  }> {
    const config = this.limits.get(category);
    if (!config) {
      throw new Error(`Unknown rate limit category: ${category}`);
    }
    
    const key = `rate_limit:${category}:${config.key_generator(req)}`;
    const now = Date.now();
    const windowStart = now - config.window_ms;
    
    // Get current request count
    const requests = await this.getRequestCount(key, windowStart, now);
    
    // Check if limit exceeded
    if (requests >= config.max_requests) {
      const oldestRequest = await this.getOldestRequest(key);
      const retryAfter = oldestRequest 
        ? Math.ceil((oldestRequest + config.window_ms - now) / 1000)
        : Math.ceil(config.window_ms / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        reset_time: new Date(now + retryAfter * 1000),
        retry_after: retryAfter
      };
    }
    
    // Record this request
    await this.recordRequest(key, now);
    
    return {
      allowed: true,
      remaining: config.max_requests - requests - 1,
      reset_time: new Date(now + config.window_ms)
    };
  }
}
```

### Input Validation and Sanitization
```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Validation schemas
export const UserInputSchemas = {
  // YouTube video title validation
  videoTitle: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be under 100 characters')
    .regex(/^[^<>{}\\]*$/, 'Title contains invalid characters'),
  
  // Script content validation
  scriptContent: z.string()
    .min(10, 'Script must be at least 10 characters')
    .max(5000, 'Script must be under 5000 characters')
    .refine(
      (content) => !/<script|javascript:|on\w+=/i.test(content),
      'Script contains potentially dangerous content'
    ),
  
  // User preferences validation
  userPreferences: z.object({
    content_style: z.enum(['motivational', 'educational', 'entertainment', 'business']),
    default_video_duration: z.number().min(15).max(180),
    auto_approve_titles: z.boolean(),
    language_preference: z.enum(['nl', 'en']),
    notification_settings: z.object({
      email_on_completion: z.boolean(),
      email_on_failure: z.boolean(),
      daily_summary: z.boolean()
    })
  }),
  
  // Generated content validation
  generatedContent: z.object({
    content_type: z.enum(['title', 'script', 'description', 'tags']),
    generated_text: z.string().min(1).max(10000),
    generation_parameters: z.record(z.unknown()),
    user_feedback: z.string().max(1000).optional()
  })
};

export class InputValidator {
  static validateAndSanitize<T>(
    data: unknown,
    schema: z.ZodSchema<T>
  ): T {
    // First, sanitize string inputs
    const sanitized = this.sanitizeObject(data);
    
    // Then validate with Zod
    const result = schema.safeParse(sanitized);
    
    if (!result.success) {
      throw new ValidationError(
        'Input validation failed',
        result.error.issues
      );
    }
    
    return result.data;
  }
  
  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return DOMPurify.sanitize(obj, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }
  
  static validateFileUpload(file: File): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      errors.push('File size exceeds 100MB limit');
    }
    
    // Check file type
    const allowedTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed');
    }
    
    // Check file name for suspicious patterns
    const dangerousPatterns = [
      /\.exe$/i,
      /\.scr$/i, 
      /\.bat$/i,
      /\.cmd$/i,
      /\.js$/i,
      /\.php$/i
    ];
    
    if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('File name contains suspicious extension');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### API Security Headers
```typescript
export const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https:",
    "connect-src 'self' https://api.supabase.co https://accounts.google.com wss:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '),
  
  // Security headers
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'camera=(),',
    'microphone=(),',
    'location=(),',
    'payment=(),',
    'usb=()'
  ].join(' '),
  
  // HSTS (for production HTTPS)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Cache control for sensitive endpoints
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export function applySecurityHeaders(res: Response, endpoint: string): void {
  // Apply all security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Endpoint-specific headers
  if (endpoint.startsWith('/api/auth/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  
  if (endpoint.startsWith('/api/')) {
    res.setHeader('X-API-Version', 'v1');
    res.setHeader('X-Request-ID', crypto.randomUUID());
  }
}
```

## Privacy and GDPR Compliance

### Data Processing Principles
```typescript
interface DataProcessingRecord {
  purpose: string;
  legal_basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  data_categories: string[];
  retention_period: string;
  sharing_with: string[];
  security_measures: string[];
}

export const dataProcessingInventory: DataProcessingRecord[] = [
  {
    purpose: 'User account management and authentication',
    legal_basis: 'contract',
    data_categories: ['email', 'name', 'password_hash', 'login_timestamps'],
    retention_period: 'Duration of account + 30 days',
    sharing_with: ['Supabase (EU infrastructure)'],
    security_measures: ['encryption_at_rest', 'row_level_security', 'access_logging']
  },
  {
    purpose: 'YouTube content analysis and automation',
    legal_basis: 'consent',
    data_categories: ['youtube_channel_data', 'video_metadata', 'analytics_data'],
    retention_period: 'Duration of consent + 30 days',
    sharing_with: ['Google YouTube API', 'Google Gemini AI'],
    security_measures: ['oauth2_tokens', 'encrypted_storage', 'audit_logging']
  },
  {
    purpose: 'AI content generation',
    legal_basis: 'consent',
    data_categories: ['video_titles', 'scripts', 'performance_data'],
    retention_period: '2 years or until consent withdrawal',
    sharing_with: ['Google Gemini AI', 'RevID API'],
    security_measures: ['data_minimization', 'purpose_limitation', 'anonymization']
  },
  {
    purpose: 'Service improvement and analytics',
    legal_basis: 'legitimate_interests',
    data_categories: ['usage_patterns', 'feature_usage', 'performance_metrics'],
    retention_period: '2 years',
    sharing_with: ['Internal analytics only'],
    security_measures: ['pseudonymization', 'aggregation', 'access_controls']
  }
];
```

### GDPR Rights Implementation
```typescript
export class GDPRComplianceService {
  // Right to Access (Article 15)
  async generateDataExport(userId: string): Promise<{
    personal_data: any;
    processing_activities: DataProcessingRecord[];
    data_sharing: any[];
    retention_schedules: any[];
  }> {
    const user = await this.getUserData(userId);
    const videos = await this.getUserVideos(userId);
    const content = await this.getUserGeneratedContent(userId);
    const jobs = await this.getUserVideoJobs(userId);
    const logs = await this.getUserSystemLogs(userId);
    
    return {
      personal_data: {
        account_information: {
          email: user.email,
          full_name: user.full_name,
          created_at: user.created_at,
          last_login: user.last_login_at,
          preferences: user.preferences
        },
        youtube_integration: {
          channel_id: user.youtube_channel_id,
          channel_title: user.youtube_channel_title,
          connected_at: user.youtube_connected_at
        },
        content_data: {
          videos_analyzed: videos.length,
          content_generated: content.length,
          videos_produced: jobs.filter(j => j.status === 'completed').length
        }
      },
      processing_activities: dataProcessingInventory,
      data_sharing: await this.getDataSharingLog(userId),
      retention_schedules: await this.getRetentionSchedules(userId)
    };
  }
  
  // Right to Rectification (Article 16)
  async updatePersonalData(
    userId: string,
    updates: Partial<{
      email: string;
      full_name: string;
      preferences: any;
    }>
  ): Promise<void> {
    // Validate updates
    const validatedUpdates = UserInputSchemas.userPreferences
      .partial()
      .parse(updates);
    
    // Update user data
    await supabase
      .from('users')
      .update({
        ...validatedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    // Log the update
    await this.logGDPRActivity(userId, 'data_rectification', {
      fields_updated: Object.keys(updates),
      timestamp: new Date()
    });
  }
  
  // Right to Erasure (Article 17)
  async deleteUserData(
    userId: string,
    reason: 'user_request' | 'consent_withdrawal' | 'account_deletion'
  ): Promise<void> {
    // Check for any legal obligations to retain data
    const retentionCheck = await this.checkRetentionRequirements(userId);
    
    if (retentionCheck.must_retain) {
      // Anonymize instead of delete
      await this.anonymizeUserData(userId);
    } else {
      // Complete deletion
      await this.completeDataDeletion(userId);
    }
    
    await this.logGDPRActivity(userId, 'data_erasure', {
      reason,
      method: retentionCheck.must_retain ? 'anonymization' : 'deletion',
      timestamp: new Date()
    });
  }
  
  // Right to Data Portability (Article 20)
  async exportPortableData(userId: string): Promise<{
    format: 'json' | 'csv';
    data: any;
    generated_at: Date;
  }> {
    const exportData = await this.generateDataExport(userId);
    
    return {
      format: 'json',
      data: {
        user_profile: exportData.personal_data.account_information,
        youtube_data: exportData.personal_data.youtube_integration,
        generated_content: await this.getPortableContent(userId),
        usage_statistics: await this.getUsageStatistics(userId)
      },
      generated_at: new Date()
    };
  }
  
  // Right to Object (Article 21)
  async processObjection(
    userId: string,
    objection: {
      processing_purpose: string;
      grounds: string;
      requested_action: 'stop_processing' | 'modify_processing' | 'delete_data';
    }
  ): Promise<{
    objection_id: string;
    status: 'accepted' | 'rejected' | 'under_review';
    reason?: string;
    actions_taken: string[];
  }> {
    const objectionId = crypto.randomUUID();
    
    // Process objection based on legal basis
    const processingRecord = dataProcessingInventory.find(
      record => record.purpose === objection.processing_purpose
    );
    
    if (!processingRecord) {
      throw new Error('Unknown processing purpose');
    }
    
    let status: 'accepted' | 'rejected' | 'under_review' = 'under_review';
    let actionsTaken: string[] = [];
    
    if (processingRecord.legal_basis === 'consent') {
      // Must honor objection for consent-based processing
      status = 'accepted';
      await this.revokeConsent(userId, objection.processing_purpose);
      actionsTaken.push('consent_revoked');
    } else if (processingRecord.legal_basis === 'legitimate_interests') {
      // Must balance interests
      const balancingTest = await this.performBalancingTest(
        userId,
        objection
      );
      status = balancingTest.result;
      actionsTaken = balancingTest.actions;
    }
    
    await this.storeObjectionRecord(userId, objectionId, objection, status);
    
    return {
      objection_id: objectionId,
      status,
      actions_taken: actionsTaken
    };
  }
}
```

### Cookie and Consent Management
```typescript
interface ConsentRecord {
  user_id: string;
  consent_id: string;
  purpose: string;
  granted: boolean;
  granted_at?: Date;
  revoked_at?: Date;
  consent_method: 'explicit' | 'implicit' | 'pre_ticked' | 'inferred';
  ip_address: string;
  user_agent: string;
}

export class ConsentManager {
  private readonly CONSENT_PURPOSES = [
    'necessary_cookies',
    'analytics_cookies', 
    'marketing_cookies',
    'youtube_integration',
    'ai_content_generation',
    'data_analytics',
    'email_communications'
  ] as const;
  
  async recordConsent(
    userId: string,
    consents: Record<string, boolean>,
    metadata: {
      ip_address: string;
      user_agent: string;
      consent_method: ConsentRecord['consent_method'];
    }
  ): Promise<void> {
    const consentId = crypto.randomUUID();
    const timestamp = new Date();
    
    for (const [purpose, granted] of Object.entries(consents)) {
      if (!this.CONSENT_PURPOSES.includes(purpose as any)) {
        throw new Error(`Unknown consent purpose: ${purpose}`);
      }
      
      const consentRecord: ConsentRecord = {
        user_id: userId,
        consent_id: consentId,
        purpose,
        granted,
        granted_at: granted ? timestamp : undefined,
        consent_method: metadata.consent_method,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent
      };
      
      await this.storeConsentRecord(consentRecord);
    }
    
    // Update user processing permissions
    await this.updateProcessingPermissions(userId, consents);
  }
  
  async checkConsent(
    userId: string,
    purpose: string
  ): Promise<{
    granted: boolean;
    granted_at?: Date;
    expires_at?: Date;
    needs_renewal: boolean;
  }> {
    const consent = await this.getLatestConsent(userId, purpose);
    
    if (!consent) {
      return {
        granted: false,
        needs_renewal: true
      };
    }
    
    // Check if consent has expired (2 years for most purposes)
    const expiryDate = new Date(consent.granted_at!);
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);
    
    const needsRenewal = expiryDate < new Date();
    
    return {
      granted: consent.granted && !needsRenewal,
      granted_at: consent.granted_at,
      expires_at: expiryDate,
      needs_renewal: needsRenewal
    };
  }
  
  async revokeConsent(
    userId: string,
    purpose: string,
    metadata: {
      ip_address: string;
      user_agent: string;
    }
  ): Promise<void> {
    // Record consent revocation
    await this.recordConsent(userId, { [purpose]: false }, {
      ...metadata,
      consent_method: 'explicit'
    });
    
    // Stop related data processing
    await this.stopDataProcessing(userId, purpose);
    
    // Schedule data deletion if required
    await this.scheduleDataDeletion(userId, purpose);
  }
}
```

## Security Monitoring and Incident Response

### Security Event Monitoring
```typescript
interface SecurityEvent {
  id: string;
  type: 'authentication_failure' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access' | 'api_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  ip_address: string;
  user_agent: string;
  details: Record<string, any>;
  timestamp: Date;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
}

export class SecurityMonitor {
  private readonly SUSPICIOUS_PATTERNS = [
    {
      name: 'multiple_failed_logins',
      pattern: (events: SecurityEvent[]) => 
        events.filter(e => e.type === 'authentication_failure').length >= 5,
      severity: 'medium' as const,
      response: 'lock_account_temporarily'
    },
    {
      name: 'unusual_location',
      pattern: (events: SecurityEvent[], userProfile: any) =>
        this.isUnusualLocation(events[0]?.ip_address, userProfile.usual_locations),
      severity: 'medium' as const,
      response: 'require_mfa'
    },
    {
      name: 'api_rate_limit_exceeded',
      pattern: (events: SecurityEvent[]) =>
        events.filter(e => e.type === 'api_abuse').length >= 3,
      severity: 'high' as const,
      response: 'block_ip_temporarily'
    }
  ];
  
  async analyzeSecurityEvents(userId?: string): Promise<{
    threats_detected: Array<{
      threat_type: string;
      severity: string;
      confidence: number;
      recommended_actions: string[];
    }>;
    risk_score: number;
  }> {
    const timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    const events = await this.getRecentSecurityEvents(userId, timeWindow);
    
    const threats: any[] = [];
    let riskScore = 0;
    
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.pattern(events, userId)) {
        const threat = {
          threat_type: pattern.name,
          severity: pattern.severity,
          confidence: this.calculateConfidence(pattern, events),
          recommended_actions: this.getRecommendedActions(pattern.response)
        };
        
        threats.push(threat);
        riskScore += this.getSeverityScore(pattern.severity);
      }
    }
    
    return {
      threats_detected: threats,
      risk_score: Math.min(riskScore, 100)
    };
  }
  
  async respondToSecurityEvent(
    event: SecurityEvent,
    automated: boolean = true
  ): Promise<{
    actions_taken: string[];
    escalated: boolean;
    notification_sent: boolean;
  }> {
    const response = {
      actions_taken: [] as string[],
      escalated: false,
      notification_sent: false
    };
    
    // Immediate automated responses
    if (automated) {
      switch (event.type) {
        case 'authentication_failure':
          if (await this.getFailedLoginCount(event.ip_address) >= 5) {
            await this.blockIPTemporarily(event.ip_address, 15); // 15 minutes
            response.actions_taken.push('ip_blocked_temporarily');
          }
          break;
          
        case 'api_abuse':
          await this.enforceStrictRateLimit(event.user_id || event.ip_address);
          response.actions_taken.push('rate_limit_enforced');
          break;
          
        case 'unauthorized_access':
          if (event.user_id) {
            await this.lockAccount(event.user_id);
            await this.revokeAllSessions(event.user_id);
            response.actions_taken.push('account_locked', 'sessions_revoked');
          }
          break;
      }
    }
    
    // Escalation criteria
    if (event.severity === 'critical' || event.type === 'data_breach') {
      response.escalated = true;
      await this.escalateToSecurityTeam(event);
    }
    
    // User notification
    if (event.user_id && event.severity !== 'low') {
      await this.notifyUser(event.user_id, event);
      response.notification_sent = true;
    }
    
    // Log response
    await this.logSecurityResponse(event.id, response);
    
    return response;
  }
}
```

### Incident Response Procedures
```typescript
interface SecurityIncident {
  id: string;
  type: 'data_breach' | 'system_compromise' | 'insider_threat' | 'ddos_attack' | 'phishing_attempt';
  severity: 1 | 2 | 3 | 4 | 5; // 1 = low, 5 = critical
  status: 'detected' | 'contained' | 'investigating' | 'resolved' | 'post_incident';
  detected_at: Date;
  contained_at?: Date;
  resolved_at?: Date;
  affected_users: string[];
  affected_systems: string[];
  data_compromised: boolean;
  gdpr_reportable: boolean;
  description: string;
  timeline: Array<{
    timestamp: Date;
    action: string;
    actor: string;
    result: string;
  }>;
}

export class IncidentResponseService {
  private readonly INCIDENT_PROCEDURES = {
    data_breach: {
      immediate_actions: [
        'isolate_affected_systems',
        'preserve_evidence',
        'assess_scope',
        'notify_security_team'
      ],
      investigation_steps: [
        'forensic_analysis',
        'root_cause_analysis',
        'impact_assessment',
        'vulnerability_assessment'
      ],
      communication_plan: [
        'internal_notification',
        'user_notification',
        'regulatory_notification',
        'public_disclosure'
      ],
      gdpr_requirements: {
        authority_notification_hours: 72,
        user_notification_required: true,
        documentation_required: true
      }
    }
  };
  
  async initiateIncidentResponse(
    incidentType: SecurityIncident['type'],
    details: {
      description: string;
      affected_systems: string[];
      estimated_affected_users: number;
      data_involved: string[];
    }
  ): Promise<{
    incident_id: string;
    response_plan: string[];
    immediate_actions: string[];
    estimated_resolution_time: number;
  }> {
    const incident: SecurityIncident = {
      id: crypto.randomUUID(),
      type: incidentType,
      severity: this.calculateIncidentSeverity(incidentType, details),
      status: 'detected',
      detected_at: new Date(),
      affected_users: [],
      affected_systems: details.affected_systems,
      data_compromised: details.data_involved.length > 0,
      gdpr_reportable: this.isGDPRReportable(incidentType, details),
      description: details.description,
      timeline: [{
        timestamp: new Date(),
        action: 'incident_detected',
        actor: 'security_system',
        result: 'incident_response_initiated'
      }]
    };
    
    // Store incident record
    await this.storeIncidentRecord(incident);
    
    // Execute immediate response
    const immediateActions = await this.executeImmediateResponse(incident);
    
    // Notify stakeholders
    await this.notifyStakeholders(incident);
    
    // Schedule follow-up actions
    await this.scheduleFollowUpActions(incident);
    
    return {
      incident_id: incident.id,
      response_plan: this.INCIDENT_PROCEDURES[incidentType]?.immediate_actions || [],
      immediate_actions: immediateActions,
      estimated_resolution_time: this.estimateResolutionTime(incident)
    };
  }
  
  async updateIncidentStatus(
    incidentId: string,
    status: SecurityIncident['status'],
    details: {
      action_taken: string;
      result: string;
      next_steps?: string[];
    }
  ): Promise<void> {
    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error('Incident not found');
    }
    
    // Update incident status
    incident.status = status;
    incident.timeline.push({
      timestamp: new Date(),
      action: details.action_taken,
      actor: 'incident_response_team',
      result: details.result
    });
    
    // Update timestamps
    if (status === 'contained' && !incident.contained_at) {
      incident.contained_at = new Date();
    }
    if (status === 'resolved' && !incident.resolved_at) {
      incident.resolved_at = new Date();
    }
    
    await this.updateIncidentRecord(incident);
    
    // GDPR notification requirements
    if (incident.gdpr_reportable && status === 'contained') {
      await this.handleGDPRNotifications(incident);
    }
    
    // Generate status report
    await this.generateStatusReport(incident);
  }
  
  private async handleGDPRNotifications(
    incident: SecurityIncident
  ): Promise<void> {
    const timeElapsed = Date.now() - incident.detected_at.getTime();
    const hoursElapsed = timeElapsed / (1000 * 60 * 60);
    
    // Authority notification (within 72 hours)
    if (hoursElapsed <= 72) {
      await this.notifyDataProtectionAuthority(incident);
    }
    
    // User notification (without undue delay)
    if (incident.affected_users.length > 0) {
      await this.notifyAffectedUsers(incident);
    }
    
    // Documentation
    await this.generateGDPRComplianceReport(incident);
  }
}
```

## Security Audit and Compliance

### Regular Security Assessments
```typescript
interface SecurityAssessment {
  id: string;
  type: 'vulnerability_scan' | 'penetration_test' | 'code_review' | 'compliance_audit';
  scheduled_date: Date;
  completed_date?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  findings: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    affected_components: string[];
    remediation_steps: string[];
    due_date: Date;
    status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  }>;
  compliance_status: {
    gdpr: 'compliant' | 'non_compliant' | 'partial';
    iso27001: 'compliant' | 'non_compliant' | 'partial';
    soc2: 'compliant' | 'non_compliant' | 'partial';
  };
}

export class SecurityAuditService {
  async scheduleSecurityAssessment(
    type: SecurityAssessment['type'],
    scheduledDate: Date
  ): Promise<string> {
    const assessment: SecurityAssessment = {
      id: crypto.randomUUID(),
      type,
      scheduled_date: scheduledDate,
      status: 'scheduled',
      findings: [],
      compliance_status: {
        gdpr: 'partial',
        iso27001: 'partial',
        soc2: 'partial'
      }
    };
    
    await this.storeAssessmentRecord(assessment);
    
    // Schedule automated scans
    if (type === 'vulnerability_scan') {
      await this.scheduleVulnerabilityScans(assessment.id);
    }
    
    return assessment.id;
  }
  
  async conductComplianceAudit(): Promise<{
    overall_score: number;
    gdpr_compliance: {
      score: number;
      gaps: string[];
      recommendations: string[];
    };
    security_posture: {
      score: number;
      strengths: string[];
      weaknesses: string[];
    };
    action_items: Array<{
      priority: 'high' | 'medium' | 'low';
      description: string;
      due_date: Date;
    }>;
  }> {
    // GDPR Compliance Check
    const gdprAudit = await this.auditGDPRCompliance();
    
    // Security Controls Assessment
    const securityAudit = await this.auditSecurityControls();
    
    // Technical Security Assessment
    const techAudit = await this.auditTechnicalSecurity();
    
    const overallScore = (
      gdprAudit.score * 0.4 +
      securityAudit.score * 0.3 +
      techAudit.score * 0.3
    );
    
    return {
      overall_score: overallScore,
      gdpr_compliance: gdprAudit,
      security_posture: securityAudit,
      action_items: this.generateActionItems([
        gdprAudit,
        securityAudit,
        techAudit
      ])
    };
  }
}
```

**[ ] TASK**: Implement comprehensive security monitoring and alerting system
**[ ] TASK**: Conduct security penetration testing and vulnerability assessment
**[ ] TASK**: Create detailed incident response playbooks and procedures
**[ ] TASK**: Implement automated compliance monitoring and reporting
**[ ] TASK**: Establish security awareness training program for development team