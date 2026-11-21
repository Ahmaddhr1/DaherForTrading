"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "@/lib/i18n/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, UserPlus, ArrowLeft } from "lucide-react";

// Lets staff attach a real customer to a draft that only has a hand-typed
// customerNameText (from the product-grid cart). Linking never finalizes
// the draft - it's still a separate explicit "Finalize Order" action.
export default function LinkCustomerModal({ open, onClose, order }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("search"); // "search" | "create"
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [linking, setLinking] = useState(false);

  const [newCustomer, setNewCustomer] = useState({ fullName: "", phoneNumber: "", debt: "" });

  const handleClose = () => {
    setMode("search");
    setSearchInput("");
    setSearchTerm("");
    setNewCustomer({ fullName: "", phoneNumber: "", debt: "" });
    onClose();
  };

  // Debounce the raw typed input before it drives the request.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: searchData, isLoading: searching } = useQuery({
    queryKey: ["draft-link-customer-search", searchTerm],
    queryFn: async () => {
      const res = await axios.get("/api/customers", {
        params: { search: searchTerm, limit: 8, sort: "nameAsc" },
      });
      return res.data;
    },
    enabled: open && mode === "search" && searchTerm.trim().length > 0,
  });
  const customers = searchData?.customers || [];
  const isSearchPending = searchInput.trim() !== searchTerm.trim();

  const linkCustomer = async (customerId) => {
    try {
      setLinking(true);
      await axios.patch(`/api/orders/${order._id}/link-customer`, { customerId });
      toast.success("Customer linked to draft");
      queryClient.invalidateQueries({ queryKey: ["orders", "draft"] });
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to link customer");
    } finally {
      setLinking(false);
    }
  };

  const handleCreateAndLink = async (e) => {
    e.preventDefault();
    if (!newCustomer.fullName.trim() || !newCustomer.phoneNumber.trim()) {
      toast.error("Name and phone number are required");
      return;
    }
    try {
      setLinking(true);
      const { data } = await axios.post("/api/customers/create", {
        fullName: newCustomer.fullName.trim(),
        phoneNumber: newCustomer.phoneNumber.trim(),
        debt: newCustomer.debt ? Number(newCustomer.debt) : 0,
      });
      await linkCustomer(data.customer._id);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create customer");
      setLinking(false);
    }
  };

  const openCreateMode = () => {
    setNewCustomer((prev) => ({ ...prev, fullName: order?.customerNameText || "" }));
    setMode("create");
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("Link a Customer")}
      description={order?.customerNameText ? t("Typed in as \"{0}\"", {
        0: order.customerNameText
      }) : undefined}
    >
      {mode === "search" ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <Input
              type="text"
              placeholder={t("Search customers by name...")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {searchInput.trim().length > 0 && (
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {(searching || isSearchPending) && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </div>
              )}
              {!searching && !isSearchPending && customers.length === 0 && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">{t("No customers found")}</div>
              )}
              {!searching && !isSearchPending &&
                customers.map((customer) => (
                  <button
                    key={customer._id}
                    type="button"
                    disabled={linking}
                    onClick={() => linkCustomer(customer._id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{customer.fullName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phoneNumber}</p>
                    </div>
                    <Badge variant={customer.debt > 0 ? "destructive" : "outline"}>
                      ${customer.debt?.toLocaleString() || 0}
                    </Badge>
                  </button>
                ))}
            </div>
          )}

          <Button type="button" variant="outline" className="w-full flex items-center gap-2" onClick={openCreateMode}>
            <UserPlus className="h-4 w-4" />
            {t("Create New Customer")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleCreateAndLink} className="space-y-3">
          <Button type="button" variant="ghost" size="sm" className="flex items-center gap-1 -ml-2" onClick={() => setMode("search")}>
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("Back to search")}
          </Button>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Full Name")}</label>
            <Input
              value={newCustomer.fullName}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, fullName: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Phone Number")}</label>
            <Input
              value={newCustomer.phoneNumber}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, phoneNumber: e.target.value.replace(/\D/g, "") }))}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Starting Debt ($, optional)")}</label>
            <Input
              type="number"
              min="0"
              value={newCustomer.debt}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, debt: e.target.value }))}
            />
          </div>
          <Button type="submit" className="w-full" disabled={linking}>
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Create & Link")}
          </Button>
        </form>
      )}
    </Modal>
  );
}
