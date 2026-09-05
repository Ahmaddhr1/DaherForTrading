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
  } from "lucide-react";

const tabs =[
    { labelKey: 'nav.dashboard', path: '/dashboard',icon:<Home /> },
    { labelKey: 'nav.customers', path: '/dashboard/customers',icon:<UserRound />},
    { labelKey: 'nav.payments', path: '/dashboard/payments', icon:<Wallet />},
    { labelKey: 'nav.disbursements', path: '/dashboard/disbursements', icon:<TrendingDown />},
    { labelKey: 'nav.companies', path: '/dashboard/companies', icon:<Building2 />},
    { labelKey: 'nav.products', path: '/dashboard/products', icon:<Box/>},
    { labelKey: 'nav.categories', path: '/dashboard/categories', icon:<Boxes/>},
    { labelKey: 'nav.orders', path: '/dashboard/orders' ,icon:<ShoppingCart />},
    { labelKey: 'nav.settings', path: '/dashboard/settings', icon:<Settings />},
]

export default tabs;
