"use client";

import { useEffect, useState } from "react";
import { getAdminBusiness } from "./admin-supabase-service";
import { createClient } from "../utils/supabase/client";

const menu = [
  "Dashboard",
  "Customers",
  "Transactions",
  "Rates",
  "Employees",
  "Reports",
  "Settings",
  "Billing",
];

interface AdminTransactionApiItem {
  id: string;
  reference: string;
  createdAt: string;
  customer: { id: string; name: string; email: string };
  recipient: {
    id: string;
    name: string;
    bankId: string;
    accountLast4: string;
    phone: string;
    sendingReason: string;
  };
  sendAmountCad: number;
  feeCad: number;
  feeTreatment: string;
  amountConvertedCad: number;
  totalCad: number;
  exchangeRate: number;
  recipientAmountEtb: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionStatus: string;
  paymentProofAvailable: boolean;
  paymentProofUploadedAt: string | null;
  paymentVerifiedAt: string | null;
  processingStartedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

interface AdminTransactionsResponse {
  business?: { id: string; name: string };
  transactions?: AdminTransactionApiItem[];
  error?: string;
}
interface AdminCustomer {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminCustomersResponse {
  business?: { id: string; name: string };
  customers?: AdminCustomer[];
  error?: string;
}
interface AdminEmployee {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface AdminEmployeesResponse {
  business?: { id: string; name: string };
  employees?: AdminEmployee[];
  error?: string;
}

interface AdminTransactionView {
  id: string;
  reference: string;
  customer: string;
  amount: string;
  rate: string;
  total: string;
  status: string;
  paymentStatus: string;
  proofAvailable: boolean;
  createdAt: string;
  sendAmountCad: number;
}


function Card({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [transactions, setTransactions] = useState<AdminTransactionView[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Business");

  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  const [newRate, setNewRate] = useState("");
  const [rateLoading, setRateLoading] = useState(true);
  const [rateSaving, setRateSaving] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateSuccess, setRateSuccess] = useState<string | null>(null);

  const [currentFee, setCurrentFee] = useState<number | null>(null);
  const [feeUpdatedAt, setFeeUpdatedAt] = useState<string | null>(null);
  const [newFee, setNewFee] = useState("");
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSuccess, setFeeSuccess] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      try {
        setRateLoading(true);
        setFeeLoading(true);
        setRateError(null);
        setFeeError(null);

        const adminBusiness = await getAdminBusiness();

        if (cancelled) return;

        setBusinessId(adminBusiness.businessId);
        setBusinessName(adminBusiness.businessName);

        const supabase = createClient();

        const { data: rateData, error: rateQueryError } = await supabase
          .from("exchange_rates")
          .select("rate, created_at")
          .eq("business_id", adminBusiness.businessId)
          .eq("base_currency", "CAD")
          .eq("quote_currency", "ETB")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rateQueryError) {
          throw new Error(rateQueryError.message);
        }

        if (cancelled) return;

        if (rateData) {
          setCurrentRate(Number(rateData.rate));
          setRateUpdatedAt(rateData.created_at);
        }

        const { data: feeData, error: feeQueryError } = await supabase
          .from("business_fees")
          .select("fee_amount, created_at")
          .eq("business_id", adminBusiness.businessId)
          .eq("currency", "CAD")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (feeQueryError) {
          throw new Error(feeQueryError.message);
        }

        if (cancelled) return;

        if (feeData) {
          setCurrentFee(Number(feeData.fee_amount));
          setFeeUpdatedAt(feeData.created_at);
        }
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load business rates and fees.";

        setRateError(message);
        setFeeError(message);
      } finally {
        if (!cancelled) {
          setRateLoading(false);
          setFeeLoading(false);
        }
      }
    }

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        setTransactionsLoading(true);
        setTransactionsError(null);

        const response = await fetch("/api/admin/transactions", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as AdminTransactionsResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load transactions.");
        }

        if (cancelled) return;

        const realTransactions = (result.transactions ?? []).map((transaction) => ({
          id: transaction.id,
          reference: transaction.reference,
          customer: transaction.customer.name || transaction.customer.email || "Unknown customer",
          amount: `$${transaction.sendAmountCad.toFixed(2)} CAD`,
          rate: transaction.exchangeRate.toFixed(2),
          total: `${transaction.recipientAmountEtb.toLocaleString()} ETB`,
          status: transaction.transactionStatus.replace(/_/g, " "),
          paymentStatus: transaction.paymentStatus.replace(/_/g, " "),
          proofAvailable: transaction.paymentProofAvailable,
          createdAt: transaction.createdAt,
          sendAmountCad: transaction.sendAmountCad,
        }));

        setTransactions(realTransactions);

        if (result.business?.name) {
          setBusinessName(result.business.name);
        }
      } catch (error) {
        if (cancelled) return;
        setTransactionsError(
          error instanceof Error ? error.message : "Unable to load transactions.",
        );
      } finally {
        if (!cancelled) {
          setTransactionsLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      try {
        setCustomersLoading(true);
        setCustomersError(null);

        const response = await fetch("/api/admin/customers", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as AdminCustomersResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load customers.");
        }

        if (cancelled) return;

        setCustomers(result.customers ?? []);

        if (result.business?.name) {
          setBusinessName(result.business.name);
        }
      } catch (error) {
        if (cancelled) return;
        setCustomersError(
          error instanceof Error ? error.message : "Unable to load customers.",
        );
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    }

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEmployees() {
      try {
        setEmployeesLoading(true);
        setEmployeesError(null);

        const response = await fetch("/api/admin/employees", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as AdminEmployeesResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load employees.");
        }

        if (cancelled) return;

        setEmployees(result.employees ?? []);

        if (result.business?.name) {
          setBusinessName(result.business.name);
        }
      } catch (error) {
        if (cancelled) return;
        setEmployeesError(
          error instanceof Error ? error.message : "Unable to load employees.",
        );
      } finally {
        if (!cancelled) setEmployeesLoading(false);
      }
    }

    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/admin/login";
  };
  const selectSection = (item: string) => {
    setActive(item);
    setMobileMenuOpen(false);
  };

  const handleUpdateRate = async () => {
    setRateError(null);
    setRateSuccess(null);

    const parsedRate = Number(newRate);

    if (!businessId) {
      setRateError("Your business could not be identified.");
      return;
    }

    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      setRateError("Please enter a valid exchange rate greater than 0.");
      return;
    }

    try {
      setRateSaving(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        throw new Error("You must be signed in to update the rate.");
      }

      const { data, error } = await supabase
        .from("exchange_rates")
        .insert({
          business_id: businessId,
          base_currency: "CAD",
          quote_currency: "ETB",
          rate: parsedRate,
          created_by: user.id,
        })
        .select("rate, created_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setCurrentRate(Number(data.rate));
      setRateUpdatedAt(data.created_at);
      setNewRate("");
      setRateSuccess("Exchange rate updated successfully.");
    } catch (error) {
      setRateError(
        error instanceof Error
          ? error.message
          : "Unable to update the exchange rate.",
      );
    } finally {
      setRateSaving(false);
    }
  };

  const handleUpdateFee = async () => {
    setFeeError(null);
    setFeeSuccess(null);

    const parsedFee = Number(newFee);

    if (!businessId) {
      setFeeError("Your business could not be identified.");
      return;
    }

    if (!Number.isFinite(parsedFee) || parsedFee < 0) {
      setFeeError("Please enter a valid transfer fee of 0 or greater.");
      return;
    }

    try {
      setFeeSaving(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        throw new Error("You must be signed in to update the transfer fee.");
      }

      const { data, error } = await supabase
        .from("business_fees")
        .insert({
          business_id: businessId,
          fee_amount: parsedFee,
          currency: "CAD",
          created_by: user.id,
        })
        .select("fee_amount, created_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setCurrentFee(Number(data.fee_amount));
      setFeeUpdatedAt(data.created_at);
      setNewFee("");
      setFeeSuccess("Transfer fee updated successfully.");
    } catch (error) {
      setFeeError(
        error instanceof Error
          ? error.message
          : "Unable to update the transfer fee.",
      );
    } finally {
      setFeeSaving(false);
    }
  };

  const formattedUpdatedAt = rateUpdatedAt
    ? new Date(rateUpdatedAt).toLocaleString()
    : "No rate has been set yet";

  const formattedFeeUpdatedAt = feeUpdatedAt
    ? new Date(feeUpdatedAt).toLocaleString()
    : "No transfer fee has been set yet";

  const today = new Date();

  const todaysTransactions = transactions.filter((transaction) => {
    const createdAt = new Date(transaction.createdAt);
    return (
      createdAt.getFullYear() === today.getFullYear() &&
      createdAt.getMonth() === today.getMonth() &&
      createdAt.getDate() === today.getDate()
    );
  });

  const todaysVolumeCad = todaysTransactions.reduce(
    (total, transaction) => total + transaction.sendAmountCad,
    0
  );

  const reportTotalTransactions = transactions.length;

  const reportTotalVolumeCad = transactions.reduce(
    (total, transaction) => total + transaction.sendAmountCad,
    0
  );

  const reportCompletedTransactions = transactions.filter(
    (transaction) => transaction.status.toLowerCase() === "completed"
  ).length;

  const reportProcessingTransactions = transactions.filter(
    (transaction) => transaction.status.toLowerCase() === "processing"
  ).length;

  const reportPendingTransactions = transactions.filter(
    (transaction) => transaction.status.toLowerCase() === "pending"
  ).length;

  const reportCompletionRate =
    reportTotalTransactions > 0
      ? (reportCompletedTransactions / reportTotalTransactions) * 100
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col bg-slate-950 text-white md:flex">
          <div className="border-b border-slate-800 px-6 py-6">
            <h1 className="text-xl font-bold">BusinessFlow</h1>
            <p className="mt-1 text-xs text-slate-400">
              Business Management
            </p>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {menu.map((item) => (
              <button
                key={item}
                onClick={() => selectSection(item)}
                className={`w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                  active === item
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="border-t border-slate-800 p-5">
            <p className="text-sm font-medium">{businessName}</p>
            <p className="text-xs text-slate-400">Business Account</p>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-4 w-full rounded-lg border border-slate-700 px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation menu"
              className="absolute inset-0 bg-slate-950/60"
              onClick={() => setMobileMenuOpen(false)}
            />

            <aside className="relative z-10 flex h-full w-[min(82vw,20rem)] flex-col bg-slate-950 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
                <div>
                  <h1 className="text-lg font-bold">BusinessFlow</h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Business Management
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  X
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                {menu.map((item) => (
                  <button
                    key={item}
                    onClick={() => selectSection(item)}
                    className={`w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                      active === item
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </nav>

              <div className="border-t border-slate-800 p-5">
                <p className="text-sm font-medium">{businessName}</p>
                <p className="text-xs text-slate-400">Business Account</p>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-4 w-full rounded-lg border border-slate-700 px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 md:px-8 md:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label="Open navigation menu"
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-xl hover:bg-slate-50 md:hidden"
                >
                  Menu
                </button>

                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold md:hidden">
                    BusinessFlow
                  </h1>

                  <h2 className="hidden text-xl font-semibold md:block">
                    {active}
                  </h2>

                  <p className="hidden text-sm text-slate-500 md:block">
                    {businessName}
                  </p>
                </div>
              </div>

              <div className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm">
                Admin Account
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 md:p-8">
            {active === "Dashboard" && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold">Welcome back</h2>
                  <p className="mt-1 text-slate-500">
                    Here&apos;s what&apos;s happening with your business today.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Card
                    title="Today's Transactions"
                    value={todaysTransactions.length.toString()}
                    note="Transactions created today"
                  />

                  <Card
                    title="Today's Volume"
                    value={`$${todaysVolumeCad.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`}
                    note="Transfer amount submitted today"
                  />

                  <Card
                    title="Current Rate"
                    value={
                      currentRate !== null
                        ? `1 CAD = ${currentRate.toFixed(2)} ETB`
                        : "Not set"
                    }
                    note={
                      currentRate !== null && rateUpdatedAt
                        ? `Updated ${new Date(rateUpdatedAt).toLocaleDateString()}`
                        : "Set your exchange rate in Rates"
                    }
                  />

                  <Card
                    title="Customers"
                    value={customersLoading ? "..." : customers.length.toString()}
                    note={
                      customersError
                        ? "Unable to load customer statistics"
                        : customers.length === 1
                          ? "1 registered customer"
                          : `${customers.length} registered customers`
                    }
                  />
                </div>

                <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 p-5">
                    <div>
                      <h3 className="font-semibold">Recent Transactions</h3>
                      <p className="text-sm text-slate-500">
                        Latest activity for your business
                      </p>
                    </div>

                    <button
                      onClick={() => setActive("Transactions")}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      View all
                    </button>
                  </div>

                  {transactionsLoading && (
                    <div className="p-5 text-sm text-slate-500">Loading transactions...</div>
                  )}

                  {transactionsError && (
                    <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {transactionsError}
                    </div>
                  )}

                  {!transactionsLoading && !transactionsError && transactions.length === 0 && (
                    <div className="p-5 text-sm text-slate-500">No transactions yet.</div>
                  )}

                  <div className="divide-y divide-slate-100 md:hidden">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold">
                            {transaction.customer}
                          </p>

                          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                            {transaction.status}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Amount</p>
                            <p className="mt-1 font-medium">
                              {transaction.amount}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">Rate</p>
                            <p className="mt-1 font-medium">
                              {transaction.rate}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="mt-1 font-medium">
                              {transaction.total}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-5 py-3">Customer</th>
                          <th className="px-5 py-3">Amount</th>
                          <th className="px-5 py-3">Rate</th>
                          <th className="px-5 py-3">Total</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {transactions.map((transaction) => (
                          <tr
                            key={transaction.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-5 py-4 font-medium">
                              {transaction.customer}
                            </td>
                            <td className="px-5 py-4">
                              {transaction.amount}
                            </td>
                            <td className="px-5 py-4">
                              {transaction.rate}
                            </td>
                            <td className="px-5 py-4">
                              {transaction.total}
                            </td>
                            <td className="px-5 py-4">
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                                {transaction.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {active === "Customers" && (
              <section>
                <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Customers</h2>
                    <p className="mt-1 text-slate-500">
                      View customers registered with your business.
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">
                    {customersLoading ? "Loading customers..." : `${customers.length} customer${customers.length === 1 ? "" : "s"}`}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {customersLoading && (
                    <div className="p-5 text-sm text-slate-500">Loading customers...</div>
                  )}

                  {customersError && (
                    <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {customersError}
                    </div>
                  )}

                  {!customersLoading && !customersError && customers.length === 0 && (
                    <div className="p-5 text-sm text-slate-500">
                      No customers have registered with this business yet.
                    </div>
                  )}

                  {!customersLoading && !customersError && customers.length > 0 && (
                    <>
                      <div className="divide-y divide-slate-100 md:hidden">
                        {customers.map((customer) => (
                          <div key={customer.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{customer.name || customer.email}</p>
                                <p className="mt-1 break-all text-sm text-slate-500">{customer.email}</p>
                              </div>
                              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                                {customer.status}
                              </span>
                            </div>
                            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                              <div>
                                <p className="text-xs text-slate-500">Phone</p>
                                <p className="mt-1 font-medium">{customer.phone || "Not provided"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Joined</p>
                                <p className="mt-1 font-medium">{new Date(customer.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-5 py-3">Customer</th>
                              <th className="px-5 py-3">Email</th>
                              <th className="px-5 py-3">Phone</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3">Joined</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customers.map((customer) => (
                              <tr key={customer.id} className="border-t border-slate-100">
                                <td className="px-5 py-4 font-medium">{customer.name || customer.email}</td>
                                <td className="px-5 py-4">{customer.email}</td>
                                <td className="px-5 py-4">{customer.phone || "Not provided"}</td>
                                <td className="px-5 py-4">
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                                    {customer.status}
                                  </span>
                                </td>
                                <td className="px-5 py-4">{new Date(customer.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}
            {active === "Transactions" && (
              <section>
                <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Transactions</h2>
                    <p className="text-slate-500">
                      Review and manage transaction activity.
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">
                    Live customer transactions
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {transactionsLoading && (
                    <div className="p-5 text-sm text-slate-500">Loading transactions...</div>
                  )}

                  {transactionsError && (
                    <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {transactionsError}
                    </div>
                  )}

                  {!transactionsLoading && !transactionsError && transactions.length === 0 && (
                    <div className="p-5 text-sm text-slate-500">No transactions yet.</div>
                  )}

                  <div className="divide-y divide-slate-100 md:hidden">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold">
                            {transaction.customer}
                          </p>

                          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                            {transaction.status}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Amount</p>
                            <p className="mt-1 font-medium">
                              {transaction.amount}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">Rate</p>
                            <p className="mt-1 font-medium">
                              {transaction.rate}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="mt-1 font-medium">
                              {transaction.total}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <table className="hidden w-full text-left text-sm md:table">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Rate</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-t border-slate-100"
                        >
                          <td className="p-4 font-medium">
                            {transaction.customer}
                          </td>
                          <td className="p-4">{transaction.amount}</td>
                          <td className="p-4">{transaction.rate}</td>
                          <td className="p-4">{transaction.total}</td>
                          <td className="p-4 capitalize text-emerald-700">
                            {transaction.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {active === "Rates" && (
              <section>
                <h2 className="text-2xl font-bold">Rates & Fees</h2>

                <p className="mt-1 text-slate-500">
                  Manage your CAD to ETB exchange rate and customer transfer fee.
                </p>

                <div className="mt-6 grid max-w-5xl gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-500">Current Rate</p>

                    {rateLoading ? (
                      <p className="mt-2 text-lg font-medium text-slate-500">
                        Loading rate...
                      </p>
                    ) : (
                      <p className="mt-2 text-4xl font-bold">
                        {currentRate !== null
                          ? `1 CAD = ${currentRate.toFixed(2)} ETB`
                          : "No rate set"}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-slate-500">
                      Last updated: {formattedUpdatedAt}
                    </p>

                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <label
                        htmlFor="new-rate"
                        className="block text-sm font-medium"
                      >
                        New CAD to ETB Rate
                      </label>

                      <input
                        id="new-rate"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={newRate}
                        onChange={(event) => setNewRate(event.target.value)}
                        placeholder="Example: 132.00"
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
                      />

                      {rateError && (
                        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                          {rateError}
                        </div>
                      )}

                      {rateSuccess && (
                        <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                          {rateSuccess}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleUpdateRate}
                        disabled={rateSaving || rateLoading}
                        className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {rateSaving ? "Updating..." : "Update Rate"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-500">
                      Current Transfer Fee
                    </p>

                    {feeLoading ? (
                      <p className="mt-2 text-lg font-medium text-slate-500">
                        Loading fee...
                      </p>
                    ) : (
                      <p className="mt-2 text-4xl font-bold">
                        {currentFee !== null
                          ? `$${currentFee.toFixed(2)} CAD`
                          : "No fee set"}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-slate-500">
                      Last updated: {formattedFeeUpdatedAt}
                    </p>

                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <label
                        htmlFor="new-fee"
                        className="block text-sm font-medium"
                      >
                        New Transfer Fee (CAD)
                      </label>

                      <input
                        id="new-fee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newFee}
                        onChange={(event) => setNewFee(event.target.value)}
                        placeholder="Example: 5.00"
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
                      />

                      {feeError && (
                        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                          {feeError}
                        </div>
                      )}

                      {feeSuccess && (
                        <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                          {feeSuccess}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleUpdateFee}
                        disabled={feeSaving || feeLoading}
                        className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {feeSaving ? "Updating..." : "Update Fee"}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {active === "Employees" && (
              <section>
                <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Employees</h2>
                    <p className="mt-1 text-slate-500">
                      View business owners, administrators, and staff access.
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">
                    {employeesLoading ? "Loading members..." : `${employees.length} member${employees.length === 1 ? "" : "s"}`}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {employeesLoading && (
                    <div className="p-5 text-sm text-slate-500">Loading business members...</div>
                  )}
                  {employeesError && (
                    <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{employeesError}</div>
                  )}
                  {!employeesLoading && !employeesError && employees.length === 0 && (
                    <div className="p-5 text-sm text-slate-500">No business members were found.</div>
                  )}
                  {!employeesLoading && !employeesError && employees.length > 0 && (
                    <>
                      <div className="divide-y divide-slate-100 md:hidden">
                        {employees.map((employee) => (
                          <div key={employee.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="break-all font-semibold">{employee.email}</p>
                                <p className="mt-1 text-sm capitalize text-slate-500">{employee.role}</p>
                              </div>
                              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                                {employee.status}
                              </span>
                            </div>
                            <div className="mt-4">
                              <p className="text-xs text-slate-500">Joined</p>
                              <p className="mt-1 text-sm font-medium">{new Date(employee.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-5 py-3">Email</th>
                              <th className="px-5 py-3">Role</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3">Joined</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employees.map((employee) => (
                              <tr key={employee.id} className="border-t border-slate-100">
                                <td className="px-5 py-4 font-medium">{employee.email}</td>
                                <td className="px-5 py-4 capitalize">{employee.role}</td>
                                <td className="px-5 py-4">
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">{employee.status}</span>
                                </td>
                                <td className="px-5 py-4">{new Date(employee.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}
            {active === "Reports" && (
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">Reports</h2>
                  <p className="mt-1 text-slate-500">
                    Business performance based on your transaction activity.
                  </p>
                </div>

                {transactionsLoading && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
                    Loading report data...
                  </div>
                )}

                {transactionsError && (
                  <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    {transactionsError}
                  </div>
                )}

                {!transactionsLoading && !transactionsError && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Card
                        title="Total Transactions"
                        value={reportTotalTransactions.toString()}
                        note="All transactions for this business"
                      />
                      <Card
                        title="Total Volume"
                        value={`$${reportTotalVolumeCad.toLocaleString("en-CA", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} CAD`}
                        note="Total submitted transfer amount"
                      />
                      <Card
                        title="Completed"
                        value={reportCompletedTransactions.toString()}
                        note="Transactions marked completed"
                      />
                      <Card
                        title="Completion Rate"
                        value={`${reportCompletionRate.toFixed(1)}%`}
                        note="Completed transactions as a share of total"
                      />
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Pending</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">
                          {reportPendingTransactions}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Waiting to move forward
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Processing</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">
                          {reportProcessingTransactions}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Currently being processed
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">Today&apos;s Volume</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">
                          ${todaysVolumeCad.toLocaleString("en-CA", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} CAD
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {todaysTransactions.length} transaction
                          {todaysTransactions.length === 1 ? "" : "s"} created today
                        </p>
                      </div>
                    </div>

                    {reportTotalTransactions === 0 && (
                      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                        No transaction activity is available for this business yet.
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
            {active === "Settings" && (
              <section>
                <h2 className="text-2xl font-bold">Business Settings</h2>

                <p className="mt-1 text-slate-500">
                  View your business profile.
                </p>

                <div className="mt-6 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <label className="text-sm font-medium">
                    Business Name
                  </label>

                  <input
                    value={businessName}
                    readOnly
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
                  />

                  <p className="mt-4 text-sm text-slate-500">
                    Business profile editing will be available when business
                    settings management is connected.
                  </p>
                </div>
              </section>
            )}
            {active === "Billing" && (
              <section>
                <h2 className="text-2xl font-bold">Billing</h2>

                <p className="mt-1 text-slate-500">
                  Manage your subscription and plan.
                </p>

                <div className="mt-6 max-w-2xl rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Current Plan</p>
                      <h3 className="mt-1 text-2xl font-bold">
                        Not configured
                      </h3>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                      Not connected
                    </span>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <p className="text-3xl font-bold">
                      Not configured
                      <span className="text-base font-normal text-slate-500">
                        
                      </span>
                    </p>

                    <button className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                      Billing setup unavailable
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}







