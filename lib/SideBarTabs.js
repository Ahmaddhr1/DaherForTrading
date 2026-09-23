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
  } from "lucide-react";

// `ownerOnly: true` marks a tab that should only be shown/linked for an
// admin whose role is "owner" - see components/MySideBar.jsx and
// MobileBottomBar.jsx, which filter this list by the current admin's role
// (fetched from /api/admin/me). This is UI-only convenience: the real
// enforcement is server-side, in middleware.js.
const tabs =[
    { label: 'Dashboard', path: '/dashboard',icon:<Home /> },
    { label: 'Customers', path: '/dashboard/customers',icon:<UserRound />},
    { label: 'Payments', path: '/dashboard/payments', icon:<Wallet />},
    { label: 'Disbursements', path: '/dashboard/disbursements', icon:<TrendingDown />},
    { label: 'Companies', path: '/dashboard/companies', icon:<Building2 />},
    { label: 'Products', path: '/dashboard/products', icon:<Box/>},
    { label: 'Categories', path: '/dashboard/categories', icon:<Boxes/>},
    { label: 'Orders', path: '/dashboard/orders' ,icon:<ShoppingCart />},
    { label: 'Admins', path: '/dashboard/admins', icon:<Users />, ownerOnly: true },
    { label: 'Activity Log', path: '/dashboard/activity', icon:<History />, ownerOnly: true },
    { label: 'Settings', path: '/dashboard/settings', icon:<Settings />},
]

export default tabs;
