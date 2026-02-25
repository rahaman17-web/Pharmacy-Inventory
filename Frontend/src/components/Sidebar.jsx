import { NavLink, useNavigate } from "react-router-dom";
import { HomeIcon, ArrowRightOnRectangleIcon, ShoppingCartIcon, DocumentChartBarIcon, ArchiveBoxIcon, CurrencyDollarIcon, UserGroupIcon, DocumentDuplicateIcon, ArrowUturnLeftIcon, CogIcon, XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';

const NavItem = ({ to, icon: Icon, children, end = true, collapsed }) => (
  <NavLink
    to={to}
    end={end}
    title={collapsed ? children : undefined}
  >
    {({ isActive }) => (
      <span className={`flex items-center rounded-lg transition-colors duration-200 group relative
        ${collapsed ? 'justify-center px-0 py-2 mx-2' : 'px-4 py-3'}
        ${isActive
          ? 'bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-white font-semibold'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        {collapsed ? (
          <span className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors
            ${isActive ? 'bg-blue-200 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-100 dark:group-hover:bg-gray-700'}`}>
            <Icon className="h-6 w-6 flex-shrink-0" />
          </span>
        ) : (
          <Icon className="h-7 w-7 flex-shrink-0 mr-3" />
        )}
        {!collapsed && <span className="font-medium text-base">{children}</span>}
        {collapsed && (
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
            {children}
          </span>
        )}
      </span>
    )}
  </NavLink>
);

export default function Sidebar({ user, onLogout, collapsed, onToggle }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const userIsAdmin = user.role === 'admin';
  const userIsManager = user.role === 'manager';

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out overflow-hidden ${collapsed ? 'w-20' : 'w-72'}`}>

      {/* Header */}
      <div className={`flex items-center h-20 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <h1 className="text-xl font-extrabold text-gray-800 dark:text-white leading-tight truncate">
              Zam Zam<br/><span className="text-sm font-medium text-gray-500">Pharmacy</span>
            </h1>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white transition-colors flex-shrink-0"
        >
          {collapsed ? <Bars3Icon className="w-7 h-7" /> : <XMarkIcon className="w-6 h-6" />}
        </button>
      </div>

      {/* Nav items */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 ${collapsed ? 'px-0' : 'px-3'}`}>
        <NavItem to="/" icon={HomeIcon} collapsed={collapsed}>Dashboard</NavItem>

        <div className="my-1 border-t border-gray-200 dark:border-gray-700 mx-2" />

        <NavItem to="/sale"     icon={ShoppingCartIcon}      collapsed={collapsed}>Sale Invoice</NavItem>
        <NavItem to="/purchase" icon={ArchiveBoxIcon}        collapsed={collapsed}>Purchase Stock</NavItem>
        <NavItem to="/returns"  icon={ArrowUturnLeftIcon}    collapsed={collapsed}>Returns &amp; Refunds</NavItem>
        <NavItem to="/reprint"  icon={DocumentDuplicateIcon} collapsed={collapsed}>Reprint Invoice</NavItem>

        <div className="my-1 border-t border-gray-200 dark:border-gray-700 mx-2" />

        {!collapsed && <p className="px-4 pt-1 pb-1 text-xs text-gray-400 uppercase tracking-wider">Reports</p>}

        <NavItem to="/stock"        icon={DocumentChartBarIcon} collapsed={collapsed}>Stock Report</NavItem>
        <NavItem to="/user-sales"   icon={DocumentChartBarIcon} collapsed={collapsed}>My Sales History</NavItem>

        {(userIsAdmin || userIsManager) && (
          <>
            <div className="my-1 border-t border-gray-200 dark:border-gray-700 mx-2" />
            {!collapsed && <p className="px-4 pt-1 pb-1 text-xs text-gray-400 uppercase tracking-wider">Management</p>}
            <NavItem to="/sales-report" icon={DocumentChartBarIcon} collapsed={collapsed}>Sales Report</NavItem>
            <NavItem to="/expenses"     icon={CurrencyDollarIcon}    collapsed={collapsed}>Expenses</NavItem>
            <NavItem to="/products"     icon={ArchiveBoxIcon}         collapsed={collapsed}>Products</NavItem>
          </>
        )}

        {userIsAdmin && (
          <>
            <NavItem to="/admin/users" icon={UserGroupIcon} collapsed={collapsed}>User Management</NavItem>
            <NavItem to="/admin/audit" icon={CogIcon}       collapsed={collapsed}>Audit Logs</NavItem>
          </>
        )}
      </div>

      {/* User / Logout */}
      <div className={`border-t border-gray-200 dark:border-gray-700 flex-shrink-0 ${collapsed ? 'py-3 flex flex-col items-center gap-2' : 'p-4'}`}>
        {!collapsed && (
          <div className="flex items-center mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {String(user.username || user.id).charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{user.username || user.id}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        {collapsed ? (
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-7 w-7" />
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm"
          >
            <ArrowRightOnRectangleIcon className="h-7 w-7 mr-3 flex-shrink-0" />
            <span className="font-medium">Logout</span>
          </button>
        )}
      </div>
    </div>
  );
}
