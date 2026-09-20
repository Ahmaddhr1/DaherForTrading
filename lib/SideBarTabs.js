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
    Shield,
    History,
  } from "lucide-react";

const tabs =[
    { label: 'Dashboard', path: '/dashboard',icon:<Home /> },
    { label: 'Customers', path: '/dashboard/customers',icon:<UserRound />},
    { label: 'Payments', path: '/dashboard/payments', icon:<Wallet />},
    { label: 'Disbursements', path: '/dashboard/disbursements', icon:<TrendingDown />},
    { label: 'Companies', path: '/dashboard/companies', icon:<Building2 />},
    { label: 'Products', path: '/dashboard/products', icon:<Box/>},
    { label: 'Categories', path: '/dashboard/categories', icon:<Boxes/>},
    { label: 'Orders', path: '/dashboard/orders' ,icon:<ShoppingCart />},
    // ownerOnly is enforced for real in middleware.js - this flag just
    // keeps the link from showing to an employee who'd get a 403 from it.
    { label: 'Admins', path: '/dashboard/admins', icon:<Shield />, ownerOnly: true },
    { label: 'Activity Log', path: '/dashboard/activity', icon:<History />, ownerOnly: true },
    { label: 'Settings', path: '/dashboard/settings', icon:<Settings />},
]

export default tabs;
