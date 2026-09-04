import {
    Home,
    ShoppingCart,
    Boxes,
    UserRound,
    Box,
    Wallet,
    Building2,
    TrendingDown,
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
]

export default tabs;
