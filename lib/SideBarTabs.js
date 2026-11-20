import {
    Home,
    ShoppingCart,
    Boxes,
    UserRound,
    Box,
    Wallet,
    Building2,
    TrendingDown,
    Settings,
    Users,
    History,
    FileText,
    PackageSearch,
    AlertTriangle,
    TrendingUp,
    LineChart,
    RotateCcw,
  } from "lucide-react";

// `ownerOnly: true` marks a tab shown only for role "owner" - never
// delegable. `permission: '<key>'` marks one shown for an owner OR an
// employee who's been granted that permission (see lib/permissions.js).
// See components/MySideBar.jsx and MobileBottomBar.jsx, which filter this
// list using the current admin's role/permissions (fetched from
// /api/admin/me). This is UI-only convenience: the real enforcement is
// server-side, in middleware.js.
//
// Drafts is a normal top-level tab here (desktop sidebar shows it exactly
// like any other tab); MobileBottomBar separately groups it into the
// Orders section sheet on mobile only, via its own label lookup below -
// that grouping doesn't come from this list's shape.
const tabs =[
    { label: 'Dashboard', path: '/dashboard',icon:<Home />, permission: 'canViewStats' },
    { label: 'Profit Margins', path: '/dashboard/reports/profit-margin', icon:<TrendingUp />, permission: 'canViewStats' },
    { label: 'Customers', path: '/dashboard/customers',icon:<UserRound />},
    { label: 'Overdue Debt', path: '/dashboard/customers/overdue', icon:<AlertTriangle />},
    { label: 'Payments', path: '/dashboard/payments', icon:<Wallet />},
    { label: 'Disbursements', path: '/dashboard/disbursements', icon:<TrendingDown />},
    { label: 'Companies', path: '/dashboard/companies', icon:<Building2 />},
    { label: 'Supplier Trends', path: '/dashboard/reports/supplier-price-trends', icon:<LineChart />, permission: 'canViewStats' },
    { label: 'Products', path: '/dashboard/products', icon:<Box/>},
    { label: 'Categories', path: '/dashboard/categories', icon:<Boxes/>},
    { label: 'Stock History', path: '/dashboard/stock-history', icon:<PackageSearch/>},
    { label: 'Orders', path: '/dashboard/orders' ,icon:<ShoppingCart />},
    { label: 'Drafts', path: '/dashboard/drafts', icon:<FileText />},
    { label: 'Returns', path: '/dashboard/returns', icon:<RotateCcw />},
    { label: 'Admins', path: '/dashboard/admins', icon:<Users />, ownerOnly: true },
    { label: 'Activity Log', path: '/dashboard/activity', icon:<History />, ownerOnly: true },
    { label: 'Settings', path: '/dashboard/settings', icon:<Settings />},
]

export default tabs;
