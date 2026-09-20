"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const fetchAccounts = async () => (await axios.get("/api/accounts")).data;

// A plain <select> of active cash/bank accounts, for any form that needs
// the admin to say which account a transaction moved money through.
export default function AccountSelect({ id, value, onChange, required = true, className = "" }) {
  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const accounts = (data?.accounts || []).filter((a) => a.active);

  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      disabled={isLoading}
      required={required}
      className={
        className ||
        "w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      }
    >
      <option value="">{isLoading ? "Loading accounts..." : "Select an account"}</option>
      {accounts.map((account) => (
        <option key={account._id} value={account._id}>
          {account.name} (${account.balance.toLocaleString()})
        </option>
      ))}
    </select>
  );
}
