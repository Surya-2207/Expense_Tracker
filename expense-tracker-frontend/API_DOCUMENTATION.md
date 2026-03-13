# Expense Tracker API Documentation

## Overview
This document describes the comprehensive API structure for the Expense Tracker application. The APIs are organized into four main modules: Expenses, Analytics, Settings, and User management.

## Font Style Updates
- **Primary Font**: Poppins (headings, titles, values)
- **Secondary Font**: Inter (body text, labels)
- Modern and clean typography for better readability

## API Base URL
```
http://localhost:8081/api
```

All endpoints below are prefixed with this base URL.

---

## 1. EXPENSES API

### Get All Expenses
```javascript
GET /expenses
Response: Array of expense objects
```

**Usage Example:**
```javascript
import { expensesAPI } from './services/api';

const expenses = await expensesAPI.getAll();
```

### Create Expense
```javascript
POST /expenses
Body: { title, amount, category, date, description? }
Response: Created expense object
```

**Usage Example:**
```javascript
const newExpense = await expensesAPI.create({
  title: 'Groceries',
  amount: 500,
  category: 'Food',
  date: '2026-02-20'
});
```

### Update Expense
```javascript
PUT /expenses/:id
Body: { title, amount, category, date, description? }
Response: Updated expense object
```

**Usage Example:**
```javascript
const updated = await expensesAPI.update(1, {
  amount: 600
});
```

### Delete Expense
```javascript
DELETE /expenses/:id
Response: Success message
```

**Usage Example:**
```javascript
await expensesAPI.delete(1);
```

### Get Expenses by Category
```javascript
GET /expenses/category/:category
Response: Array of expenses in that category
```

**Usage Example:**
```javascript
const foodExpenses = await expensesAPI.getByCategory('Food');
```

### Get Expenses by Date Range
```javascript
GET /expenses/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Response: Array of expenses within date range
```

**Usage Example:**
```javascript
const monthlyExpenses = await expensesAPI.getByDateRange('2026-02-01', '2026-02-28');
```

---

## 2. ANALYTICS API

### Get Summary
```javascript
GET /analytics/summary
Response: {
  totalExpenses: number,
  averageExpense: number,
  highestExpense: number,
  lowestExpense: number,
  totalTransactions: number
}
```

**Usage Example:**
```javascript
import { analyticsAPI } from './services/api';

const summary = await analyticsAPI.getSummary();
```

### Get Trend Data
```javascript
GET /analytics/trends?period=monthly|weekly|daily
Response: Array of trend data points
```

**Usage Example:**
```javascript
const trends = await analyticsAPI.getTrendData('monthly');
```

### Get Category Breakdown
```javascript
GET /analytics/categories
Response: Array of { category, total, percentage }
```

**Usage Example:**
```javascript
const breakdown = await analyticsAPI.getCategoryBreakdown();
```

### Get Monthly Comparison
```javascript
GET /analytics/comparison?months=3
Response: Comparison data for specified months
```

**Usage Example:**
```javascript
const comparison = await analyticsAPI.getMonthlyComparison(3);
```

### Get Spending Insights
```javascript
GET /analytics/insights
Response: {
  topCategory: string,
  topExpense: object,
  averageDaily: number,
  trend: 'increasing' | 'decreasing' | 'stable'
}
```

**Usage Example:**
```javascript
const insights = await analyticsAPI.getSpendingInsights();
```

---

## 3. SETTINGS API

### Get Settings
```javascript
GET /settings
Response: Current user settings object
```

**Usage Example:**
```javascript
import { settingsAPI } from './services/api';

const settings = await settingsAPI.getSettings();
```

### Update Settings
```javascript
PUT /settings
Body: { theme, currency, notifications, budget?, ... }
Response: Updated settings object
```

**Usage Example:**
```javascript
const updated = await settingsAPI.updateSettings({
  theme: 'dark',
  currency: 'USD'
});
```

### Get Currency Setting
```javascript
GET /settings/currency
Response: { currency: 'INR', symbol: '₹' }
```

**Usage Example:**
```javascript
const currencyInfo = await settingsAPI.getCurrency();
```

### Set Currency
```javascript
POST /settings/currency
Body: { currency: 'USD' | 'INR' | 'EUR' | ... }
Response: { currency: string, symbol: string }
```

**Usage Example:**
```javascript
await settingsAPI.setCurrency('USD');
```

### Get Notification Settings
```javascript
GET /settings/notifications
Response: { emailNotifications: boolean, pushNotifications: boolean, ... }
```

**Usage Example:**
```javascript
const notifSettings = await settingsAPI.getNotificationSettings();
```

### Update Notification Settings
```javascript
PUT /settings/notifications
Body: { emailNotifications: boolean, pushNotifications: boolean, ... }
Response: Updated notification settings
```

**Usage Example:**
```javascript
await settingsAPI.updateNotificationSettings({
  emailNotifications: true,
  pushNotifications: false
});
```

### Export Data
```javascript
GET /settings/export?format=csv|xlsx|json
Response: File blob (CSV, Excel, or JSON)
```

**Usage Example:**
```javascript
const csvData = await settingsAPI.exportData('csv');
```

---

## 4. USER API

### Get User Profile
```javascript
GET /user/profile
Response: { id, name, email, avatar, createdAt, ... }
```

**Usage Example:**
```javascript
import { userAPI } from './services/api';

const profile = await userAPI.getProfile();
```

### Update Profile
```javascript
PUT /user/profile
Body: { name, email, avatar?, ... }
Response: Updated user object
```

**Usage Example:**
```javascript
const updated = await userAPI.updateProfile({
  name: 'John Doe'
});
```

### Login
```javascript
POST /user/login
Body: { email, password }
Response: { user: object, token: string }
```

**Usage Example:**
```javascript
const response = await userAPI.login('user@example.com', 'password123');
```

### Register
```javascript
POST /user/register
Body: { name, email, password }
Response: { user: object, token: string }
```

**Usage Example:**
```javascript
const response = await userAPI.register({
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'securePassword'
});
```

### Logout
```javascript
Response: { success: true }
```

**Usage Example:**
```javascript
await userAPI.logout();
```

### Change Password
```javascript
POST /user/change-password
Body: { oldPassword, newPassword }
Response: { success: true }
```

**Usage Example:**
```javascript
await userAPI.changePassword('oldPassword', 'newPassword');
```

### Get Budgets
```javascript
GET /user/budgets
Response: Array of budget objects { category, limit, spent, ... }
```

**Usage Example:**
```javascript
const budgets = await userAPI.getBudgets();
```

### Update Budgets
```javascript
PUT /user/budgets
Body: { budgets: Array<{ category, limit }> }
Response: Updated budgets
```

**Usage Example:**
```javascript
await userAPI.updateBudgets({
  budgets: [
    { category: 'Food', limit: 2000 },
    { category: 'Transportation', limit: 5000 }
  ]
});
```

---

## Using React Hooks

The application provides custom hooks for easier API integration:

### useExpenses Hook
```javascript
import { useExpenses } from './hooks/useApi';

function MyComponent() {
  const { 
    expenses, 
    loading, 
    error, 
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense 
  } = useExpenses();

  return (
    // Your component code
  );
}
```

### useAnalytics Hook
```javascript
import { useAnalytics } from './hooks/useApi';

function AnalyticsComponent() {
  const { 
    summary, 
    trends, 
    categoryBreakdown, 
    loading,
    fetchTrends,
    fetchSummary 
  } = useAnalytics();

  return (
    // Your component code
  );
}
```

### useSettings Hook
```javascript
import { useSettings } from './hooks/useApi';

function SettingsComponent() {
  const { 
    settings, 
    loading, 
    error,
    updateSettings,
    changeCurrency 
  } = useSettings();

  return (
    // Your component code
  );
}
```

### useUser Hook
```javascript
import { useUser } from './hooks/useApi';

function UserComponent() {
  const { 
    user, 
    loading, 
    error,
    isAuthenticated,
    login,
    logout,
    updateProfile 
  } = useUser();

  return (
    // Your component code
  );
}
```

---

## Error Handling

All API calls include error handling. Errors are caught and logged to the console:

```javascript
try {
  const data = await expensesAPI.getAll();
} catch (error) {
  console.error('Error fetching expenses:', error);
  // Handle error appropriately
}
```

---

## Authentication

JWT Token-based authentication is implemented:

1. On login/register, a token is returned
2. Token is stored in localStorage
3. Token is automatically added to all subsequent requests in the `Authorization` header
4. On logout, token is cleared

```javascript
// Token is automatically handled by the API service
const response = await userAPI.login(email, password);
// Token is now stored and will be sent with all requests
```

---

## Environment Configuration

Set the API base URL using environment variables:

```
REACT_APP_API_URL=http://your-api-domain.com/api
```

The default is `http://localhost:8081/api`

---

## File Structure

```
src/
├── services/
│   └── api.js              # API service with all endpoints
├── config/
│   └── apiConfig.js        # API configuration
├── hooks/
│   └── useApi.js           # Custom React hooks for API calls
└── App.js                  # Main app component
```

---

## Next Steps

1. Set up backend API endpoints matching this structure
2. Configure token management for authentication
3. Implement error boundaries for better error handling
4. Add loading states and skeleton screens
5. Implement data caching strategies
