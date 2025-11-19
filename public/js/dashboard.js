// Dashboard Application
class Dashboard {
    constructor() {
        this.apiBaseUrl = '/api';
        this.authToken = localStorage.getItem('authToken');
        this.currentSection = 'overview';
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
        document.querySelectorAll('.close-btn, [data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.classList.contains('close-btn') || e.target.dataset.modal) {
                    const modalId = e.target.dataset.modal;
                    if (modalId) {
                        this.closeModal(modalId);
                    }
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
            this.authToken = 'demo-token';
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
        }
    }

    async loadOverviewData() {
        try {
            // Mock data for demonstration
            const data = {
                totalUsers: 42,
                activeTokens: 128,
                apiRequests: '15,234',
                systemStatus: 'Healthy'
            };

            document.getElementById('totalUsers').textContent = data.totalUsers;
            document.getElementById('activeTokens').textContent = data.activeTokens;
            document.getElementById('apiRequests').textContent = data.apiRequests;
            document.getElementById('systemStatus').textContent = data.systemStatus;

            // Load recent activity
            this.loadRecentActivity();
        } catch (error) {
            console.error('Error loading overview:', error);
            this.showError('Failed to load overview data');
        }
    }

    loadRecentActivity() {
        const activities = [
            'New user registered: john@example.com',
            'Token created for API access',
            'System backup completed successfully',
            'Rate limit adjusted for user: admin',
            'New API endpoint accessed: /chat/completions'
        ];

        const activityLog = document.getElementById('activityLog');
        activityLog.innerHTML = activities
            .map(activity => `<div class="activity-item">${activity}</div>`)
            .join('');
    }

    async loadUsers() {
        try {
            const tbody = document.getElementById('usersTableBody');

            // Mock user data
            const users = [
                {
                    id: '1',
                    username: 'admin',
                    email: 'admin@nttapi.com',
                    role: 'admin',
                    status: 'active',
                    created: '2024-01-15'
                },
                {
                    id: '2',
                    username: 'developer',
                    email: 'dev@example.com',
                    role: 'user',
                    status: 'active',
                    created: '2024-02-20'
                },
                {
                    id: '3',
                    username: 'tester',
                    email: 'test@example.com',
                    role: 'user',
                    status: 'inactive',
                    created: '2024-03-10'
                }
            ];

            tbody.innerHTML = users.map(user => `
                <tr data-user-id="${user.id}">
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td><span class="badge ${user.status}">${user.status}</span></td>
                    <td>${user.created}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="dashboard.editUser('${user.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="dashboard.deleteUser('${user.id}')">Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users');
        }
    }

    async loadTokens() {
        try {
            const tbody = document.getElementById('tokensTableBody');

            // Mock token data
            const tokens = [
                {
                    id: 'tok_abc123',
                    name: 'Production API',
                    user: 'admin',
                    status: 'active',
                    expires: '2025-12-31',
                    lastUsed: '2 hours ago'
                },
                {
                    id: 'tok_def456',
                    name: 'Development',
                    user: 'developer',
                    status: 'active',
                    expires: '2025-06-30',
                    lastUsed: '5 minutes ago'
                },
                {
                    id: 'tok_ghi789',
                    name: 'Testing Token',
                    user: 'tester',
                    status: 'expired',
                    expires: '2024-01-01',
                    lastUsed: '30 days ago'
                }
            ];

            tbody.innerHTML = tokens.map(token => `
                <tr>
                    <td><code>${token.id}</code></td>
                    <td>${token.name}</td>
                    <td>${token.user}</td>
                    <td><span class="badge ${token.status}">${token.status}</span></td>
                    <td>${token.expires}</td>
                    <td>${token.lastUsed}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="dashboard.viewToken('${token.id}')">View</button>
                        <button class="btn btn-sm btn-danger" onclick="dashboard.revokeToken('${token.id}')">Revoke</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading tokens:', error);
            this.showError('Failed to load tokens');
        }
    }

    async loadAnalytics(timeRange) {
        try {
            // Mock analytics data
            const stats = {
                totalRequests: '45,678',
                avgResponseTime: '125ms',
                errorRate: '0.8%',
                successRate: '99.2%'
            };

            document.getElementById('totalRequests').textContent = stats.totalRequests;
            document.getElementById('avgResponseTime').textContent = stats.avgResponseTime;
            document.getElementById('errorRate').textContent = stats.errorRate;
            document.getElementById('successRate').textContent = stats.successRate;

            // Update chart placeholders
            document.getElementById('requestsChart').textContent = `Requests chart for ${timeRange} (Chart library integration pending)`;
            document.getElementById('tokenUsageChart').textContent = `Token usage chart for ${timeRange} (Chart library integration pending)`;
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Failed to load analytics');
        }
    }

    async loadSystemHealth() {
        try {
            // Mock health data
            const health = {
                serverUptime: '15 days 6 hours',
                dbConnections: '24/100',
                dbResponseTime: '12ms',
                redisMemory: '256MB / 2GB',
                redisHitRate: '94.5%',
                activeLimits: '156',
                blockedRequests: '42'
            };

            document.getElementById('serverUptime').textContent = health.serverUptime;
            document.getElementById('dbConnections').textContent = health.dbConnections;
            document.getElementById('dbResponseTime').textContent = health.dbResponseTime;
            document.getElementById('redisMemory').textContent = health.redisMemory;
            document.getElementById('redisHitRate').textContent = health.redisHitRate;
            document.getElementById('activeLimits').textContent = health.activeLimits;
            document.getElementById('blockedRequests').textContent = health.blockedRequests;

            this.loadLogs();
        } catch (error) {
            console.error('Error loading system health:', error);
            this.showError('Failed to load system health');
        }
    }

    loadLogs() {
        const logLevel = document.getElementById('logLevel')?.value || 'all';
        const logsContainer = document.getElementById('logsContainer');

        // Mock log data
        const logs = [
            { level: 'info', message: '[2024-11-19 10:30:15] API request processed successfully', class: 'info' },
            { level: 'info', message: '[2024-11-19 10:30:10] New token created: tok_abc123', class: 'info' },
            { level: 'warn', message: '[2024-11-19 10:29:45] Rate limit approaching for user: developer', class: 'warn' },
            { level: 'info', message: '[2024-11-19 10:29:30] Database connection pool refreshed', class: 'info' },
            { level: 'error', message: '[2024-11-19 10:29:15] Failed authentication attempt from 192.168.1.100', class: 'error' },
            { level: 'info', message: '[2024-11-19 10:29:00] Cache hit rate: 95.2%', class: 'info' },
            { level: 'info', message: '[2024-11-19 10:28:45] System health check passed', class: 'info' }
        ];

        const filteredLogs = logLevel === 'all'
            ? logs
            : logs.filter(log => log.level === logLevel);

        logsContainer.innerHTML = filteredLogs.length > 0
            ? filteredLogs.map(log => `<div class="log-entry ${log.class}">${log.message}</div>`).join('')
            : '<div class="log-entry">No logs found for selected level</div>';
    }

    openUserModal(userId = null) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');

        if (userId) {
            title.textContent = 'Edit User';
            // Load user data and populate form
        } else {
            title.textContent = 'Add New User';
            form.reset();
        }

        modal.classList.add('active');
    }

    openTokenModal() {
        const modal = document.getElementById('tokenModal');
        const form = document.getElementById('tokenForm');
        const userSelect = document.getElementById('tokenUser');

        // Populate user dropdown
        userSelect.innerHTML = `
            <option value="">Select user...</option>
            <option value="1">admin</option>
            <option value="2">developer</option>
            <option value="3">tester</option>
        `;

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
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            // Mock API call
            console.log('Saving user:', { username, email, role });

            this.showSuccess('User saved successfully');
            this.closeModal('userModal');
            this.loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            this.showError('Failed to save user');
        }
    }

    async createToken() {
        try {
            const tokenName = document.getElementById('tokenName').value;
            const tokenUser = document.getElementById('tokenUser').value;
            const tokenExpiry = document.getElementById('tokenExpiry').value;

            // Mock API call
            console.log('Creating token:', { tokenName, tokenUser, tokenExpiry });

            this.showSuccess('Token created successfully');
            this.closeModal('tokenModal');
            this.loadTokens();
        } catch (error) {
            console.error('Error creating token:', error);
            this.showError('Failed to create token');
        }
    }

    async editUser(userId) {
        console.log('Edit user:', userId);
        this.openUserModal(userId);
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                // Mock API call
                console.log('Deleting user:', userId);
                this.showSuccess('User deleted successfully');
                this.loadUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showError('Failed to delete user');
            }
        }
    }

    async viewToken(tokenId) {
        alert(`Token details for ${tokenId} would be displayed here`);
    }

    async revokeToken(tokenId) {
        if (confirm('Are you sure you want to revoke this token?')) {
            try {
                // Mock API call
                console.log('Revoking token:', tokenId);
                this.showSuccess('Token revoked successfully');
                this.loadTokens();
            } catch (error) {
                console.error('Error revoking token:', error);
                this.showError('Failed to revoke token');
            }
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

    showSuccess(message) {
        // Simple alert for now - could be replaced with a toast notification
        alert(message);
    }

    showError(message) {
        // Simple alert for now - could be replaced with a toast notification
        alert('Error: ' + message);
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
