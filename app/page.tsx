"use client";

import { useState } from "react";

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

const transactions = [
  { customer: "Alex Morgan", amount: "$1,000.00", rate: "1.3675", total: "$1,367.50", status: "Completed" },
  { customer: "Sarah Ahmed", amount: "$2,500.00", rate: "1.3675", total: "$3,418.75", status: "Completed" },
  { customer: "Michael Chen", amount: "$750.00", rate: "1.3675", total: "$1,025.63", status: "Completed" },
  { customer: "Daniel Johnson", amount: "$1,250.00", rate: "1.3675", total: "$1,709.38", status: "Completed" },
];

const customers = [
  { name: "Alex Morgan", email: "alex@example.com", transactions: 12, status: "Active" },
  { name: "Sarah Ahmed", email: "sarah@example.com", transactions: 8, status: "Active" },
  { name: "Michael Chen", email: "michael@example.com", transactions: 6, status: "Active" },
  { name: "Daniel Johnson", email: "daniel@example.com", transactions: 4, status: "Active" },
];

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col bg-slate-950 text-white md:flex">
          <div className="border-b border-slate-800 px-6 py-6">
            <h1 className="text-xl font-bold">BusinessFlow</h1>
            <p className="mt-1 text-xs text-slate-400">Business Management</p>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {menu.map((item) => (
              <button
                key={item}
                onClick={() => setActive(item)}
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
            <p className="text-sm font-medium">Demo Business</p>
            <p className="text-xs text-slate-400">Customer Preview</p>
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-slate-200 bg-white px-6 py-4 md:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{active}</h2>
                <p className="text-sm text-slate-500">
                  Demo Business • Customer demonstration
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium">
                Demo Account
              </div>
            </div>
          </header>

          <div className="p-6 md:p-8">
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
                    value="24"
                    note="+12% from yesterday"
                  />
                  <Card
                    title="Today's Volume"
                    value="$18,450"
                    note="+8.4% from yesterday"
                  />
                  <Card
                    title="Current Rate"
                    value="1.3675"
                    note="Updated today"
                  />
                  <Card
                    title="Active Customers"
                    value="142"
                    note="+6 this month"
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

                  <div className="overflow-x-auto">
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
                            key={transaction.customer}
                            className="border-t border-slate-100"
                          >
                            <td className="px-5 py-4 font-medium">
                              {transaction.customer}
                            </td>
                            <td className="px-5 py-4">{transaction.amount}</td>
                            <td className="px-5 py-4">{transaction.rate}</td>
                            <td className="px-5 py-4">{transaction.total}</td>
                            <td className="px-5 py-4">
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
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
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Customers</h2>
                    <p className="text-slate-500">
                      Manage your business customers.
                    </p>
                  </div>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                    + Add Customer
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Transactions</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer) => (
                        <tr
                          key={customer.email}
                          className="border-t border-slate-100"
                        >
                          <td className="p-4 font-medium">{customer.name}</td>
                          <td className="p-4 text-slate-500">{customer.email}</td>
                          <td className="p-4">{customer.transactions}</td>
                          <td className="p-4">
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                              {customer.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {active === "Transactions" && (
              <section>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Transactions</h2>
                    <p className="text-slate-500">
                      Review and manage transaction activity.
                    </p>
                  </div>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                    + New Transaction
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
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
                          key={transaction.customer}
                          className="border-t border-slate-100"
                        >
                          <td className="p-4 font-medium">
                            {transaction.customer}
                          </td>
                          <td className="p-4">{transaction.amount}</td>
                          <td className="p-4">{transaction.rate}</td>
                          <td className="p-4">{transaction.total}</td>
                          <td className="p-4 text-emerald-700">
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
                <h2 className="text-2xl font-bold">Rates</h2>
                <p className="mt-1 text-slate-500">
                  Manage your current business rate.
                </p>

                <div className="mt-6 max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Current Rate</p>
                  <p className="mt-2 text-4xl font-bold">1.3675</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Last updated today at 9:30 AM
                  </p>

                  <button className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                    Update Rate
                  </button>
                </div>
              </section>
            )}

            {active === "Employees" && (
              <section>
                <h2 className="text-2xl font-bold">Employees</h2>
                <p className="mt-1 text-slate-500">
                  Manage employees and access roles.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    ["Jordan Smith", "Owner"],
                    ["Emily Wilson", "Administrator"],
                    ["David Brown", "Employee"],
                  ].map(([name, role]) => (
                    <div
                      key={name}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                        {name[0]}
                      </div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-slate-500">{role}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {active === "Reports" && (
              <section>
                <h2 className="text-2xl font-bold">Reports</h2>
                <p className="mt-1 text-slate-500">
                  Business performance and operational reporting.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <Card title="Monthly Volume" value="$284,750" note="Current month" />
                  <Card title="Transactions" value="386" note="Current month" />
                  <Card title="New Customers" value="18" note="Current month" />
                </div>
              </section>
            )}

            {active === "Settings" && (
              <section>
                <h2 className="text-2xl font-bold">Business Settings</h2>
                <p className="mt-1 text-slate-500">
                  Manage your business profile.
                </p>

                <div className="mt-6 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <label className="text-sm font-medium">Business Name</label>
                  <input
                    defaultValue="Demo Business"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />

                  <label className="mt-5 block text-sm font-medium">
                    Business Email
                  </label>
                  <input
                    defaultValue="demo@example.com"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />

                  <button className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                    Save Changes
                  </button>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Current Plan</p>
                      <h3 className="mt-1 text-2xl font-bold">Professional</h3>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                      Demo
                    </span>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <p className="text-3xl font-bold">
                      $49
                      <span className="text-base font-normal text-slate-500">
                        /month
                      </span>
                    </p>

                    <button className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                      View Plans
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