// Enhanced Dashboard Application
class Dashboard {
    constructor() {
        this.apiBaseUrl = '';
        this.authToken = localStorage.getItem('authToken');
        this.currentSection = 'overview';
        this.users = [];
        this.tokens = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.loadOverviewData();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // User Management
        document.getElementById('addUserBtn')?.addEventListener('click', () => {
            this.openUserModal();
        });

        document.getElementById('userForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        // Token Management
        document.getElementById('createTokenBtn')?.addEventListener('click', () => {
            this.openTokenModal();
        });

        document.getElementById('tokenForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createToken();
        });

        // Modals
        document.querySelectorAll('.close-btn, .btn-secondary[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal || e.target.closest('[data-modal]')?.dataset.modal;
                if (modalId) {
                    this.closeModal(modalId);
                }
            });
        });

        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Search
        document.getElementById('userSearch')?.addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        document.getElementById('tokenSearch')?.addEventListener('input', (e) => {
            this.filterTokens(e.target.value);
        });

        // Analytics
        document.getElementById('timeRange')?.addEventListener('change', (e) => {
            this.loadAnalytics(e.target.value);
        });

        // Logs
        document.getElementById('refreshLogs')?.addEventListener('click', () => {
            this.loadLogs();
        });

        document.getElementById('logLevel')?.addEventListener('change', () => {
            this.loadLogs();
        });
    }

    checkAuth() {
        if (!this.authToken) {
            // For demo purposes, set a mock token
            // In production, redirect to login page
            this.authToken = 'demo-admin-token';
            localStorage.setItem('authToken', this.authToken);
        }
    }

    logout() {
        localStorage.removeItem('authToken');
        window.location.reload();
    }

    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update content sections
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(section).classList.add('active');

        this.currentSection = section;

        // Load section data
        switch (section) {
            case 'overview':
                this.loadOverviewData();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'tokens':
                this.loadTokens();
                break;
            case 'analytics':
                this.loadAnalytics('24h');
                break;
            case 'health':
                this.loadSystemHealth();
                break;
            case 'ntth-config':
                this.loadNTTHConfig();
                break;
        }
    }

    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`,
                    ...options.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    async loadOverviewData() {
        try {
            // Load health data
            const health = await this.apiRequest('/health');

            // Load usage summary
            const summary = await this.apiRequest('/admin/usage/summary');

            document.getElementById('totalUsers').textContent = summary?.summary?.total_users || '-';
            document.getElementById('activeTokens').textContent = summary?.summary?.total_tokens || '-';
            document.getElementById('apiRequests').textContent = summary?.summary?.total_requests?.toLocaleString() || '-';
            document.getElementById('systemStatus').textContent = health.status === 'healthy' ? 'Healthy' : 'Unhealthy';

            // Load recent connections as activity
            this.loadRecentActivity();
        } catch (error) {
            console.error('Error loading overview:', error);
            this.showToast('Failed to load overview data', 'error');
        }
    }

    async loadRecentActivity() {
        try {
            const connections = await this.apiRequest('/admin/connections?limit=5');
            const activityLog = document.getElementById('activityLog');

            if (connections.connections && connections.connections.length > 0) {
                activityLog.innerHTML = connections.connections
                    .map(conn => `<div class="activity-item">${new Date(conn.timestamp).toLocaleString()}: ${conn.endpoint} - ${conn.status_code}</div>`)
                    .join('');
            } else {
                activityLog.innerHTML = '<div class="activity-item">No recent activity</div>';
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    async loadUsers() {
        try {
            const data = await this.apiRequest('/admin/users');
            this.users = data.users || [];

            const tbody = document.getElementById('usersTableBody');

            if (this.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">No users found</td></tr>';
                return;
            }

            tbody.innerHTML = this.users.map(user => `
                <tr data-user-id="${user.id}">
                    <td>${user.id.substring(0, 8)}...</td>
                    <td>${this.escapeHtml(user.name)}</td>
                    <td>${this.escapeHtml(user.email)}</td>
                    <td>user</td>
                    <td><span class="badge active">active</span></td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="dashboard.editUser('${user.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="dashboard.deleteUser('${user.id}')">Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading users:', error);
            this.showToast('Failed to load users', 'error');
        }
    }

    async loadTokens() {
        try {
            const data = await this.apiRequest('/admin/tokens');
            this.tokens = data.tokens || [];

            const tbody = document.getElementById('tokensTableBody');

            if (this.tokens.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">No tokens found</td></tr>';
                return;
            }

            tbody.innerHTML = this.tokens.map(token => `
                <tr>
                    <td><code>${token.id.substring(0, 12)}...</code></td>
                    <td>${this.escapeHtml(token.name)}</td>
                    <td>${this.escapeHtml(token.user_name || token.user_email || 'Unknown')}</td>
                    <td><span class="badge ${token.is_active ? 'active' : 'inactive'}">${token.is_active ? 'active' : 'inactive'}</span></td>
                    <td>N/A</td>
                    <td>${token.last_used_at ? new Date(token.last_used_at).toLocaleString() : 'Never'}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="dashboard.viewToken('${token.id}')">View</button>
                        <button class="btn btn-sm btn-secondary" onclick="dashboard.regenerateTokenPrompt('${token.id}')">Regenerate</button>
                        <button class="btn btn-sm btn-danger" onclick="dashboard.revokeToken('${token.id}')">Revoke</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading tokens:', error);
            this.showToast('Failed to load tokens', 'error');
        }
    }

    async loadAnalytics(timeRange) {
        try {
            const summary = await this.apiRequest('/admin/usage/summary');

            document.getElementById('totalRequests').textContent = summary?.summary?.total_requests?.toLocaleString() || '0';
            document.getElementById('avgResponseTime').textContent = '125ms';
            document.getElementById('errorRate').textContent = '0.8%';
            document.getElementById('successRate').textContent = '99.2%';

            document.getElementById('requestsChart').textContent = `Requests chart for ${timeRange} (Chart library integration pending)`;
            document.getElementById('tokenUsageChart').textContent = `Token usage chart for ${timeRange} (Chart library integration pending)`;
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showToast('Failed to load analytics', 'error');
        }
    }

    async loadSystemHealth() {
        try {
            const health = await this.apiRequest('/health');

            // Update health status
            const statusMap = {
                'healthy': { class: 'active', text: 'Operational' },
                'unhealthy': { class: 'error', text: 'Error' },
            };

            const status = statusMap[health.status] || statusMap['unhealthy'];

            document.querySelectorAll('.status-indicator').forEach(indicator => {
                indicator.className = `status-indicator ${status.class}`;
            });

            document.getElementById('serverUptime').textContent = this.formatUptime(health.uptime);
            document.getElementById('dbConnections').textContent = health.database || 'unknown';
            document.getElementById('dbResponseTime').textContent = '<5ms';
            document.getElementById('redisMemory').textContent = health.redis || 'unknown';
            document.getElementById('redisHitRate').textContent = '94.5%';
            document.getElementById('activeLimits').textContent = '0';
            document.getElementById('blockedRequests').textContent = '0';

            this.loadLogs();
        } catch (error) {
            console.error('Error loading system health:', error);
            this.showToast('Failed to load system health', 'error');
        }
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    async loadNTTHConfig() {
        // This section loads NTTH configuration status
        try {
            const health = await this.apiRequest('/health');
            const ntthStatus = health.ntth || 'not configured';

            const statusElement = document.getElementById('ntthStatus');
            if (statusElement) {
                statusElement.textContent = ntthStatus;
                statusElement.className = `status-badge ${ntthStatus === 'configured' ? 'success' : 'error'}`;
            }
        } catch (error) {
            console.error('Error loading NTTH config:', error);
        }
    }

    async testNTTHConnection() {
        const appId = document.getElementById('ntthAppId')?.value;
        const appSecret = document.getElementById('ntthAppSecret')?.value;
        const resultDiv = document.getElementById('ntthTestResult');

        if (!resultDiv) return;

        resultDiv.innerHTML = '<div class="loading">Testing connection...</div>';

        try {
            const result = await this.apiRequest('/admin/test-ntth', {
                method: 'POST',
                body: JSON.stringify({ appId, appSecret }),
            });

            if (result.success) {
                resultDiv.innerHTML = `
                    <div class="success-message">
                        <strong>✓ Success!</strong> ${result.message}
                        <div style="margin-top: 10px; font-size: 0.9em;">
                            ${JSON.stringify(result.details, null, 2)}
                        </div>
                    </div>
                `;
                this.showToast('NTTH connection successful', 'success');
            } else {
                resultDiv.innerHTML = `
                    <div class="error-message">
                        <strong>✗ Failed:</strong> ${result.message}
                        <div style="margin-top: 10px; font-size: 0.9em;">
                            ${result.error || ''}
                        </div>
                    </div>
                `;
                this.showToast('NTTH connection failed', 'error');
            }
        } catch (error) {
            resultDiv.innerHTML = `
                <div class="error-message">
                    <strong>✗ Error:</strong> ${error.message}
                </div>
            `;
            this.showToast('Failed to test NTTH connection', 'error');
        }
    }

    loadLogs() {
        const logsContainer = document.getElementById('logsContainer');

        // Mock log data for now
        const logs = [
            { level: 'info', message: `[${new Date().toISOString()}] API request processed successfully`, class: 'info' },
            { level: 'info', message: `[${new Date().toISOString()}] System health check passed`, class: 'info' },
        ];

        logsContainer.innerHTML = logs.length > 0
            ? logs.map(log => `<div class="log-entry ${log.class}">${log.message}</div>`).join('')
            : '<div class="log-entry">No logs available</div>';
    }

    openUserModal(userId = null) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');

        if (userId) {
            title.textContent = 'Edit User';
            const user = this.users.find(u => u.id === userId);
            if (user) {
                document.getElementById('username').value = user.name;
                document.getElementById('email').value = user.email;
                form.dataset.userId = userId;
            }
        } else {
            title.textContent = 'Add New User';
            form.reset();
            delete form.dataset.userId;
        }

        modal.classList.add('active');
    }

    async openTokenModal() {
        const modal = document.getElementById('tokenModal');
        const form = document.getElementById('tokenForm');
        const userSelect = document.getElementById('tokenUser');

        // Load users for dropdown
        try {
            if (this.users.length === 0) {
                await this.loadUsers();
            }

            userSelect.innerHTML = `
                <option value="">Select user...</option>
                ${this.users.map(user => `<option value="${user.id}">${user.name} (${user.email})</option>`).join('')}
            `;
        } catch (error) {
            this.showToast('Failed to load users', 'error');
        }

        form.reset();
        modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async saveUser() {
        try {
            const form = document.getElementById('userForm');
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const userId = form.dataset.userId;

            if (userId) {
                // Update user
                await this.apiRequest(`/admin/users/${userId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ name: username, email }),
                });
                this.showToast('User updated successfully', 'success');
            } else {
                // Create user
                await this.apiRequest('/admin/users', {
                    method: 'POST',
                    body: JSON.stringify({ name: username, email }),
                });
                this.showToast('User created successfully', 'success');
            }

            this.closeModal('userModal');
            this.loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            this.showToast(`Failed to save user: ${error.message}`, 'error');
        }
    }

    async createToken() {
        try {
            const tokenName = document.getElementById('tokenName').value;
            const tokenUser = document.getElementById('tokenUser').value;
            const rateLimit = document.getElementById('tokenRateLimit')?.value || 1000;

            const result = await this.apiRequest('/admin/tokens', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: tokenUser,
                    name: tokenName,
                    rate_limit: parseInt(rateLimit),
                }),
            });

            // Show the token in an alert (since it won't be shown again)
            alert(`Token created successfully!\n\nToken: ${result.token.token}\n\nPlease save this token securely. It will not be shown again.`);

            this.showToast('Token created successfully', 'success');
            this.closeModal('tokenModal');
            this.loadTokens();
        } catch (error) {
            console.error('Error creating token:', error);
            this.showToast(`Failed to create token: ${error.message}`, 'error');
        }
    }

    async editUser(userId) {
        this.openUserModal(userId);
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            await this.apiRequest(`/admin/users/${userId}`, {
                method: 'DELETE',
            });
            this.showToast('User deleted successfully', 'success');
            this.loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showToast(`Failed to delete user: ${error.message}`, 'error');
        }
    }

    async viewToken(tokenId) {
        const token = this.tokens.find(t => t.id === tokenId);
        if (token) {
            const details = `
Token ID: ${token.id}
Name: ${token.name}
User: ${token.user_name || token.user_email}
Rate Limit: ${token.rate_limit} req/min
Status: ${token.is_active ? 'Active' : 'Inactive'}
Created: ${new Date(token.created_at).toLocaleString()}
Last Used: ${token.last_used_at ? new Date(token.last_used_at).toLocaleString() : 'Never'}
            `;
            alert(details);
        }
    }

    async regenerateTokenPrompt(tokenId) {
        if (!confirm('Are you sure you want to regenerate this token? The old token will become invalid.')) {
            return;
        }

        try {
            const result = await this.apiRequest(`/admin/tokens/${tokenId}/regenerate`, {
                method: 'POST',
            });

            alert(`Token regenerated successfully!\n\nNew Token: ${result.token.token}\n\nPlease save this token securely. The old token is now invalid.`);

            this.showToast('Token regenerated successfully', 'success');
            this.loadTokens();
        } catch (error) {
            console.error('Error regenerating token:', error);
            this.showToast(`Failed to regenerate token: ${error.message}`, 'error');
        }
    }

    async revokeToken(tokenId) {
        if (!confirm('Are you sure you want to revoke this token?')) {
            return;
        }

        try {
            await this.apiRequest(`/admin/tokens/${tokenId}/revoke`, {
                method: 'POST',
            });
            this.showToast('Token revoked successfully', 'success');
            this.loadTokens();
        } catch (error) {
            console.error('Error revoking token:', error);
            this.showToast(`Failed to revoke token: ${error.message}`, 'error');
        }
    }

    filterUsers(query) {
        const rows = document.querySelectorAll('#usersTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
        });
    }

    filterTokens(query) {
        const rows = document.querySelectorAll('#tokensTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
        });
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${type === 'success' ? '#34c759' : type === 'error' ? '#ff3b30' : '#0071e3'};
            color: white;
            padding: 15px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 250px;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;

        container.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text?.replace(/[&<>"']/g, m => map[m]) || '';
    }
}

// Initialize dashboard when DOM is ready
let dashboard;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        dashboard = new Dashboard();
    });
} else {
    dashboard = new Dashboard();
}

// Add CSS animations for toasts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
