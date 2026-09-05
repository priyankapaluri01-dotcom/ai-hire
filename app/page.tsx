"use client";

import { useState } from "react";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Role = "RECRUITER" | "CHRO";

type QueryResult =
  | Record<string, unknown>
  | Array<Record<string, unknown>>
  | null;

type Visualization =
  | {
      type: "metric";
      data: {
        value: number;
        label: string;
      };
    }
  | {
      type: "bar";
      xKey: string;
      yKey: string;
      data: Array<Record<string, unknown>>;
    }
  | {
      type: "pie";
      nameKey: string;
      valueKey: string;
      data: Array<Record<string, unknown>>;
    }
  | null;

const roleConfig = {
  RECRUITER: {
    label: "Recruiter",
    description: "Your assigned requisitions",
  },
  CHRO: {
    label: "CHRO",
    description: "Organization-wide hiring data",
  },
};

const suggestions = [
  "How many open jobs do I have?",
  "What is the average time-to-fill for Engineering?",
  "Show me hires by department",
];

export default function Home() {
  const [role, setRole] =
    useState<Role>("RECRUITER");

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [result, setResult] =
    useState<QueryResult>(null);

  const [visualization, setVisualization] =
    useState<Visualization>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const currentRole =
    roleConfig[role];

  // ----------------------------------
  // SUGGESTION CLICK
  // ----------------------------------

  const handleSuggestionClick = (
    suggestion: string
  ) => {
    setQuestion(suggestion);
    setError("");
    setAnswer("");
    setResult(null);
    setVisualization(null);
  };

  // ----------------------------------
  // SUBMIT QUESTION
  // ----------------------------------

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!question.trim() || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");
    setResult(null);
    setVisualization(null);

    try {
      const response = await fetch(
        "/api/query",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            question: question.trim(),
            role,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Something went wrong."
        );
      }

      setAnswer(
        data.answer || ""
      );

      setResult(
        data.result || null
      );

      setVisualization(
        data.visualization || null
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process the question."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#171717]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">

        {/* HEADER */}

        <header className="flex h-20 items-center justify-between border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Ask Your Hiring Data
            </h1>

            <p className="text-xs text-gray-500">
              Hiring Analytics Assistant
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 sm:flex">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Hiring data
            </div>

            <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs">
              <span className="text-gray-400">
                Viewing as
              </span>

              <select
                value={role}
                onChange={(event) =>
                  setRole(
                    event.target.value as Role
                  )
                }
                className="cursor-pointer bg-transparent font-medium outline-none"
              >
                <option value="RECRUITER">
                  Recruiter
                </option>

                <option value="CHRO">
                  CHRO
                </option>
              </select>
            </label>
          </div>
        </header>

        {/* MAIN */}

        <section className="flex flex-1 flex-col items-center py-16">

          {/* HERO */}

          <div className="mb-10 max-w-2xl text-center">

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Synthetic hiring data
            </div>

            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Your hiring data,
              <br />

              <span className="text-gray-400">
                just ask.
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-gray-500">
              Ask questions about jobs, hires,
              headcount, and recruiting performance
              in plain English.
            </p>
          </div>

          {/* ACCESS SCOPE */}

          <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs">

            <span className="text-gray-400">
              Access scope:
            </span>

            <span className="font-medium">
              {currentRole.label}
            </span>

            <span className="text-gray-400">
              · {currentRole.description}
            </span>
          </div>

          {/* QUESTION BOX */}

          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-2 shadow-sm"
          >

            <textarea
              value={question}
              onChange={(event) =>
                setQuestion(
                  event.target.value
                )
              }
              placeholder="Ask a question about your hiring data..."
              rows={3}
              className="w-full resize-none border-0 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-400"
            />

            <div className="flex items-center justify-between border-t border-gray-100 px-2 pt-2">

              <span className="px-2 text-xs text-gray-400">
                Read-only · Access enforced server-side
              </span>

              {/* IMPORTANT:
                  Only loading disables the button.
                  handleSubmit still validates empty questions.
              */}

              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading
                  ? "Thinking..."
                  : "Ask →"}
              </button>
            </div>
          </form>

          {/* SUGGESTIONS */}

          <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">

            {suggestions.map(
              (suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    handleSuggestionClick(
                      suggestion
                    )
                  }
                  disabled={loading}
                  className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              )
            )}

          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-8 w-full max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ANSWER */}

          {answer && !error && (
            <div className="mt-8 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <div className="mb-4 flex items-center gap-2">

                <span className="h-2 w-2 rounded-full bg-green-500" />

                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Answer
                </span>

              </div>

              <p className="text-lg font-medium">
                {answer}
              </p>

              {/* VISUALIZATION */}

              <ResultVisualization
                visualization={
                  visualization
                }
                result={result}
              />

            </div>
          )}

          {/* TRUST */}

          <div className="mt-12 flex flex-col items-center gap-2 text-center text-xs text-gray-400">

            <span>🔒</span>

            <span>
              Your role determines which hiring
              records can be queried.
            </span>

            <span>
              The assistant cannot access data
              outside your permitted scope.
            </span>

          </div>

        </section>

        {/* FOOTER */}

        <footer className="flex h-16 items-center justify-center border-t border-gray-200 text-xs text-gray-400">
          AI Hiring Analytics · Read-only · Synthetic Data
        </footer>

      </div>
    </main>
  );
}

/* =====================================================
   RESULT VISUALIZATION
===================================================== */

function ResultVisualization({
  visualization,
  result,
}: {
  visualization: Visualization;
  result: QueryResult;
}) {
  if (!result) {
    return null;
  }

  /* ---------------------------------------------
     METRIC
  --------------------------------------------- */

  if (
    visualization?.type ===
    "metric"
  ) {
    return (
      <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-5">

        <div className="flex items-end justify-between">

          <span className="text-sm text-gray-500">
            {visualization.data.label}
          </span>

          <span className="text-3xl font-semibold">
            {visualization.data.value}
          </span>

        </div>

      </div>
    );
  }

  /* ---------------------------------------------
     PIE CHART
  --------------------------------------------- */

  if (
    visualization?.type ===
    "pie"
  ) {
    return (
      <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-5">

        <div className="mb-4">

          <h3 className="text-sm font-medium">
            Department distribution
          </h3>

          <p className="mt-1 text-xs text-gray-400">
            Headcount by department
          </p>

        </div>

        <div className="h-[320px] w-full">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <PieChart>

              <Pie
                data={
                  visualization.data
                }
                dataKey={
                  visualization.valueKey
                }
                nameKey={
                  visualization.nameKey
                }
                cx="50%"
                cy="50%"
                outerRadius={105}
                label
              >
                {visualization.data.map(
                  (_, index) => (
                    <Cell
                      key={`cell-${index}`}
                    />
                  )
                )}
              </Pie>

              <Tooltip />

            </PieChart>
          </ResponsiveContainer>

        </div>

        {/* PIE LEGEND */}

        <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-gray-500">

          {visualization.data.map(
            (item, index) => (
              <div
                key={index}
                className="flex items-center gap-2"
              >

                <span className="h-2 w-2 rounded-full bg-gray-400" />

                <span>
                  {String(
                    item[
                      visualization.nameKey
                    ]
                  )}
                </span>

                <span className="font-medium text-gray-700">
                  {String(
                    item[
                      visualization.valueKey
                    ]
                  )}
                </span>

              </div>
            )
          )}

        </div>

      </div>
    );
  }

  /* ---------------------------------------------
     BAR CHART
  --------------------------------------------- */

  if (
    visualization?.type ===
    "bar"
  ) {
    return (
      <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-5">

        <div className="mb-4">

          <h3 className="text-sm font-medium">
            Breakdown
          </h3>

          <p className="mt-1 text-xs text-gray-400">
            {visualization.yKey}
          </p>

        </div>

        <div className="h-[300px] w-full">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                visualization.data
              }
              margin={{
                top: 10,
                right: 10,
                left: -10,
                bottom: 10,
              }}
            >

              <XAxis
                dataKey={
                  visualization.xKey
                }
                tick={{
                  fontSize: 11,
                }}
              />

              <YAxis
                allowDecimals={false}
                tick={{
                  fontSize: 11,
                }}
              />

              <Tooltip />

              <Bar
                dataKey={
                  visualization.yKey
                }
                radius={[
                  4,
                  4,
                  0,
                  0,
                ]}
              />

            </BarChart>
          </ResponsiveContainer>

        </div>

      </div>
    );
  }

  /* ---------------------------------------------
     FALLBACK
  --------------------------------------------- */

  return null;
}