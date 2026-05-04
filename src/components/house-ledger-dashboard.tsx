"use client";

import { startTransition, useDeferredValue, useState } from "react";
import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  format,
  isBefore,
  isToday,
  parseISO,
} from "date-fns";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarClock,
  CheckCircle2,
  CircleX,
  FileStack,
  Filter,
  Home,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wrench,
} from "lucide-react";

type PropertyId = "maple" | "elm";
type StatusFilter = "all" | "upcoming" | "overdue" | "completed";
type FrequencyUnit = "weeks" | "months" | "years";

type Property = {
  id: PropertyId;
  name: string;
  address: string;
  type: string;
  detail: string;
};

type Task = {
  id: string;
  title: string;
  propertyId: PropertyId;
  area: string;
  dueDate: string;
  lastCompleted: string | null;
  interval: number;
  unit: FrequencyUnit;
  why: string;
};

type RecordCard = {
  id: string;
  propertyId: PropertyId;
  title: string;
  subtitle: string;
  detail: string;
  tag: string;
};

const properties: Property[] = [
  {
    id: "maple",
    name: "Maple Street",
    address: "2148 Maple Street",
    type: "Primary home",
    detail: "1928 craftsman • 2,480 sq ft • family profile",
  },
  {
    id: "elm",
    name: "Elm Rental",
    address: "37 Elm Court",
    type: "Rental unit",
    detail: "Duplex upper floor • tenant occupied • annual inspection",
  },
];

const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Swap HVAC filter",
    propertyId: "maple",
    area: "Utility hall",
    dueDate: "2026-05-02",
    lastCompleted: "2026-02-01",
    interval: 3,
    unit: "months",
    why: "Keeps airflow balanced and protects the blower motor.",
  },
  {
    id: "t2",
    title: "Dryer vent cleanout",
    propertyId: "maple",
    area: "Laundry",
    dueDate: "2026-05-12",
    lastCompleted: "2025-11-12",
    interval: 6,
    unit: "months",
    why: "Reduces fire risk and keeps drying time from creeping upward.",
  },
  {
    id: "t3",
    title: "Water heater flush",
    propertyId: "maple",
    area: "Basement",
    dueDate: "2026-05-29",
    lastCompleted: "2025-05-29",
    interval: 1,
    unit: "years",
    why: "Prevents sediment buildup and extends tank life.",
  },
  {
    id: "t4",
    title: "Smoke detector battery sweep",
    propertyId: "elm",
    area: "Hall + bedrooms",
    dueDate: "2026-04-28",
    lastCompleted: "2025-10-28",
    interval: 6,
    unit: "months",
    why: "Cuts down false alarms and keeps the rental inspection-ready.",
  },
  {
    id: "t5",
    title: "Gutter check after spring bloom",
    propertyId: "elm",
    area: "Roofline",
    dueDate: "2026-05-06",
    lastCompleted: "2025-11-06",
    interval: 6,
    unit: "months",
    why: "Avoids fascia staining and overflow at the rear corner.",
  },
];

const assetRecords: RecordCard[] = [
  {
    id: "a1",
    propertyId: "maple",
    title: "Bosch dishwasher",
    subtitle: "Kitchen • SHPM65Z55N",
    detail: "Warranty ends Feb 2027 • manual, install invoice, and serial photo on file.",
    tag: "Appliance",
  },
  {
    id: "a2",
    propertyId: "maple",
    title: "American Standard furnace",
    subtitle: "Basement • model S9X2",
    detail: "Last serviced Jan 2026 • filter size 16x25x1 • linked to HVAC schedule.",
    tag: "System",
  },
  {
    id: "a3",
    propertyId: "elm",
    title: "Whirlpool stacked laundry",
    subtitle: "Laundry closet • tenant-use machine",
    detail: "Purchase receipt and serial numbers captured for landlord insurance.",
    tag: "Appliance",
  },
];

const documents: RecordCard[] = [
  {
    id: "d1",
    propertyId: "maple",
    title: "Homeowners policy 2026",
    subtitle: "Insurance • PDF",
    detail: "Renewal confirmed with sewer backup rider and updated kitchen valuation.",
    tag: "Document",
  },
  {
    id: "d2",
    propertyId: "maple",
    title: "Washer install receipt",
    subtitle: "Receipt • scanned invoice",
    detail: "Includes install date, labor note, and haul-away confirmation.",
    tag: "Document",
  },
  {
    id: "d3",
    propertyId: "elm",
    title: "City rental inspection packet",
    subtitle: "Permit • due annually",
    detail: "Stores checklist, permit PDF, and smoke detector compliance photo set.",
    tag: "Document",
  },
];

const issues: RecordCard[] = [
  {
    id: "i1",
    propertyId: "maple",
    title: "North window trim hairline crack",
    subtitle: "Monitoring • dining room",
    detail: "Logged with photos after winter rain. No moisture spread in the last 60 days.",
    tag: "Issue",
  },
  {
    id: "i2",
    propertyId: "elm",
    title: "Guest bath fan rattles on startup",
    subtitle: "Open • 2nd floor bath",
    detail: "Likely bearing wear. Tenant reported increased noise during shower use.",
    tag: "Issue",
  },
];

const statusLabel: Record<StatusFilter, string> = {
  all: "All work",
  upcoming: "Due soon",
  overdue: "Overdue",
  completed: "Completed",
};

const DUE_SOON_WINDOW_DAYS = 14;
const RECENTLY_COMPLETED_WINDOW_DAYS = 21;
const TODAY = parseISO("2026-05-04");

const seasonalNotes: Record<
  PropertyId,
  {
    label: string;
    detail: string;
    checklist: string[];
  }
> = {
  maple: {
    label: "Spring pressure check",
    detail:
      "Maple Street is entering its high-pollen, heavy-rain stretch. The right work now is airflow, drainage, and anything that can quietly leak.",
    checklist: ["Filter swap", "Gutter runoff", "Window trim review"],
  },
  elm: {
    label: "Tenant-ready turnover",
    detail:
      "Elm Rental benefits from quick, visible compliance checks. Keep safety tasks current and the permit packet within one click.",
    checklist: ["Alarm batteries", "Bath fan noise", "Inspection packet"],
  },
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function formatIntervalLabel(interval: number, unit: FrequencyUnit) {
  const singularUnit = unit.slice(0, -1);
  return `every ${interval} ${interval === 1 ? singularUnit : unit}`;
}

function advanceDueDate(task: Task, anchorDate: Date) {
  if (task.unit === "weeks") {
    return addWeeks(anchorDate, task.interval);
  }

  if (task.unit === "years") {
    return addYears(anchorDate, task.interval);
  }

  return addMonths(anchorDate, task.interval);
}

function getDayDelta(task: Task, today: Date) {
  return differenceInCalendarDays(parseISO(task.dueDate), today);
}

function isDueSoonTask(task: Task, today: Date) {
  const dayDelta = getDayDelta(task, today);
  return dayDelta >= 0 && dayDelta <= DUE_SOON_WINDOW_DAYS;
}

function getTaskStatus(task: Task, today: Date): Exclude<StatusFilter, "all"> {
  if (
    task.lastCompleted &&
    differenceInCalendarDays(today, parseISO(task.lastCompleted)) <=
      RECENTLY_COMPLETED_WINDOW_DAYS
  ) {
    return "completed";
  }

  const dueDate = parseISO(task.dueDate);
  if (isBefore(dueDate, today) && !isToday(dueDate)) {
    return "overdue";
  }

  return "upcoming";
}

function statusTone(status: Exclude<StatusFilter, "all">) {
  if (status === "overdue") {
    return "bg-[var(--signal-soft)] text-[var(--signal)] border-[rgba(165,90,55,0.18)]";
  }

  if (status === "completed") {
    return "bg-[var(--accent-soft)] text-[var(--accent)] border-[rgba(46,92,77,0.2)]";
  }

  return "bg-white/75 text-[var(--foreground)] border-[rgba(40,50,45,0.12)]";
}

function EmptyCollection({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-[var(--paper)] px-4 py-7 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

export function HouseLedgerDashboard() {
  const [selectedProperty, setSelectedProperty] = useState<PropertyId>("maple");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState(initialTasks);

  const deferredSearch = useDeferredValue(searchQuery);
  const today = TODAY;
  const query = normalize(deferredSearch);

  const selectedPropertyMeta =
    properties.find((property) => property.id === selectedProperty) ?? properties[0];
  const selectedSeasonalNote = seasonalNotes[selectedProperty];

  const selectedPropertyTasks = tasks.filter(
    (task) => task.propertyId === selectedProperty,
  );

  const visibleTasks = selectedPropertyTasks
    .filter((task) => {
      const taskStatus = getTaskStatus(task, today);
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "upcoming"
            ? taskStatus === "upcoming" && isDueSoonTask(task, today)
            : taskStatus === statusFilter;
      const haystack = normalize(
        `${task.title} ${task.area} ${task.why} ${selectedPropertyMeta.name}`,
      );

      return matchesStatus && (!query || haystack.includes(query));
    })
    .sort((leftTask, rightTask) => {
      const statusRank = {
        overdue: 0,
        upcoming: 1,
        completed: 2,
      } satisfies Record<Exclude<StatusFilter, "all">, number>;

      const leftStatus = getTaskStatus(leftTask, today);
      const rightStatus = getTaskStatus(rightTask, today);

      if (statusRank[leftStatus] !== statusRank[rightStatus]) {
        return statusRank[leftStatus] - statusRank[rightStatus];
      }

      return getDayDelta(leftTask, today) - getDayDelta(rightTask, today);
    });

  const visibleAssets = assetRecords.filter((record) => {
    const matchesProperty = record.propertyId === selectedProperty;
    const haystack = normalize(`${record.title} ${record.subtitle} ${record.detail}`);
    return matchesProperty && (!query || haystack.includes(query));
  });

  const visibleDocuments = documents.filter((record) => {
    const matchesProperty = record.propertyId === selectedProperty;
    const haystack = normalize(`${record.title} ${record.subtitle} ${record.detail}`);
    return matchesProperty && (!query || haystack.includes(query));
  });

  const visibleIssues = issues.filter((record) => {
    const matchesProperty = record.propertyId === selectedProperty;
    const haystack = normalize(`${record.title} ${record.subtitle} ${record.detail}`);
    return matchesProperty && (!query || haystack.includes(query));
  });

  const propertyTaskCounts = {
    all: selectedPropertyTasks.length,
    upcoming: selectedPropertyTasks.filter(
      (task) => getTaskStatus(task, today) === "upcoming" && isDueSoonTask(task, today),
    ).length,
    overdue: selectedPropertyTasks.filter(
      (task) => getTaskStatus(task, today) === "overdue",
    ).length,
    completed: selectedPropertyTasks.filter(
      (task) => getTaskStatus(task, today) === "completed",
    ).length,
  } satisfies Record<StatusFilter, number>;

  const totalMatches =
    visibleTasks.length +
    visibleAssets.length +
    visibleDocuments.length +
    visibleIssues.length;

  const nextDueTask = selectedPropertyTasks
    .filter((task) => getTaskStatus(task, today) !== "completed")
    .sort((leftTask, rightTask) => getDayDelta(leftTask, today) - getDayDelta(rightTask, today))
    .at(0);

  function handleTaskComplete(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        const completionDate = today;
        return {
          ...task,
          lastCompleted: format(completionDate, "yyyy-MM-dd"),
          dueDate: format(advanceDueDate(task, completionDate), "yyyy-MM-dd"),
        };
      }),
    );
  }

  return (
    <main className="dashboard-shell mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 overflow-hidden px-4 py-5 text-[15px] text-[var(--foreground)] sm:px-6 lg:px-8 [&_*]:min-w-0">
      <section className="grain paper-panel ledger-grid reveal-fade overflow-hidden rounded-[32px]">
        <div className="grid gap-10 px-6 py-6 lg:grid-cols-[1.5fr_0.85fr] lg:px-10 lg:py-9">
          <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <p className="section-kicker">Household operations ledger</p>
                <div className="space-y-2">
                  <h1 className="display-type max-w-[9ch] text-[3.55rem] leading-[0.92] tracking-[-0.05em] text-[var(--foreground)] sm:max-w-3xl sm:text-6xl sm:leading-none sm:tracking-[-0.04em]">
                    A field notebook for running a house without letting it run you.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
                    House Ledger organizes recurring maintenance, appliance history,
                    documents, and unresolved issues into one calm command surface.
                  </p>
                </div>
              </div>

              <div className="accent-ring paper-panel-strong min-w-0 rounded-[24px] p-4 sm:min-w-72">
                <p className="section-kicker">{selectedPropertyMeta.type}</p>
                <div className="mt-3 space-y-1">
                  <p className="text-lg font-semibold">{selectedPropertyMeta.name}</p>
                  <p className="text-sm text-[var(--muted)]">{selectedPropertyMeta.address}</p>
                  <p className="text-sm text-[var(--muted)]">{selectedPropertyMeta.detail}</p>
                </div>
                <div className="mt-5 flex items-center justify-between rounded-[18px] border border-[var(--line)] bg-white/72 px-3 py-3">
                  <div>
                    <p className="section-kicker">Next pressure point</p>
                    <p className="mt-1 text-sm font-semibold">
                      {nextDueTask ? nextDueTask.title : "No active maintenance"}
                    </p>
                  </div>
                  <div className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm text-[var(--accent)]">
                    {nextDueTask
                      ? format(parseISO(nextDueTask.dueDate), "MMM d")
                      : "Clear"}
                  </div>
                </div>
              </div>
            </div>

            <article className="accent-ring lift-card rounded-[28px] border border-[var(--line)] bg-white/64 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="section-kicker">Seasonal focus</p>
                  <div className="mt-3 flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold">{selectedSeasonalNote.label}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {selectedSeasonalNote.detail}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:max-w-72 lg:justify-end">
                  {selectedSeasonalNote.checklist.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[rgba(46,92,77,0.16)] bg-[var(--paper)] px-3 py-1.5 text-sm text-[var(--foreground)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </article>

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="lift-card rounded-[24px] border border-[var(--line)] bg-white/65 p-4">
                <div className="flex items-center justify-between">
                  <span className="section-kicker">Due in 2 weeks</span>
                  <CalendarClock className="size-4 text-[var(--accent)]" />
                </div>
                <p className="mt-4 text-3xl font-semibold">
                  {propertyTaskCounts.upcoming}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  High-friction upkeep is surfaced early, before it turns into repair debt.
                </p>
              </article>

              <article className="lift-card rounded-[24px] border border-[rgba(165,90,55,0.18)] bg-[var(--signal-soft)]/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="section-kicker text-[var(--signal)]">Needs attention</span>
                  <TriangleAlert className="size-4 text-[var(--signal)]" />
                </div>
                <p className="mt-4 text-3xl font-semibold">{propertyTaskCounts.overdue}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  The list stays short on purpose, so you can tell what actually matters next.
                </p>
              </article>

              <article className="lift-card rounded-[24px] border border-[rgba(46,92,77,0.16)] bg-[var(--accent-soft)]/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="section-kicker text-[var(--accent)]">Records on file</span>
                  <Archive className="size-4 text-[var(--accent)]" />
                </div>
                <p className="mt-4 text-3xl font-semibold">
                  {visibleAssets.length + visibleDocuments.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Manuals, warranties, and receipts stay tied to the things they describe.
                </p>
              </article>
            </div>
          </div>

          <aside className="paper-panel-strong reveal-fade reveal-delay-1 rounded-[30px] p-5">
            <div className="flex items-center justify-between">
              <p className="section-kicker">House rhythm</p>
              <BellRing className="size-4 text-[var(--accent)]" />
            </div>

            <div className="mt-5 space-y-4">
              {[
                {
                  title: "Reminder digest",
                  detail: "One weekly homeowner brief instead of scattered pings.",
                  icon: BellRing,
                },
                {
                  title: "Shared access",
                  detail: "Partner or tenant context lives with the property, not in text threads.",
                  icon: Home,
                },
                {
                  title: "Warranty memory",
                  detail: "The manual, receipt, and install date appear together when you need them.",
                  icon: ShieldCheck,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="lift-card rounded-[22px] border border-[var(--line)] bg-white/70 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                      <item.icon className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-[rgba(27,33,31,0.12)] bg-[var(--foreground)] p-5 text-white">
              <p className="section-kicker text-white/55">Completion memory</p>
              <p className="mt-3 text-3xl font-semibold">{propertyTaskCounts.completed}</p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Recently completed work stays visible for three weeks so recurring upkeep
                feels acknowledged instead of vanishing instantly.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="paper-panel reveal-fade reveal-delay-2 rounded-[32px] px-5 py-5 lg:px-7">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="section-kicker">Operations board</p>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <h2 className="display-type max-w-[14ch] text-[2.55rem] leading-[0.96] tracking-[-0.05em] sm:max-w-none sm:text-4xl sm:leading-none sm:tracking-[-0.04em]">
                  Practical clarity, not another generic to-do list.
                </h2>
                <span className="rounded-full border border-[var(--line)] bg-white/75 px-3 py-1 text-sm text-[var(--muted)]">
                  {statusLabel[statusFilter]}
                </span>
              </div>
            </div>

            <label className="flex w-full items-center gap-3 rounded-full border border-[var(--line)] bg-white/80 px-4 py-3 focus-within:border-[rgba(46,92,77,0.28)] focus-within:bg-white lg:max-w-md">
              <Search className="size-4 text-[var(--muted)]" />
              <input
                aria-label="Search tasks, records, and issues"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                placeholder="Search furnace, warranty, gutter, permit..."
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => setSearchQuery(nextValue));
                }}
              />
              {searchQuery ? (
                <button
                  aria-label="Clear search query"
                  className="shrink-0 rounded-full p-1 text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  type="button"
                  onClick={() => setSearchQuery("")}
                >
                  <CircleX className="size-4" />
                </button>
              ) : null}
            </label>
          </div>

          <div className="blueprint-rule flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {properties.map((property) => (
                <button
                  key={property.id}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    selectedProperty === property.id
                      ? "border-[rgba(46,92,77,0.28)] bg-[var(--accent)] text-white shadow-[0_14px_35px_rgba(46,92,77,0.18)]"
                      : "border-[var(--line)] bg-white/75 text-[var(--foreground)] hover:-translate-y-0.5 hover:border-[rgba(46,92,77,0.2)]"
                  }`}
                  aria-pressed={selectedProperty === property.id}
                  type="button"
                  onClick={() => setSelectedProperty(property.id)}
                >
                  {property.name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <Filter className="size-4" />
                Filter
              </div>
              {(Object.keys(statusLabel) as StatusFilter[]).map((filter) => (
                <button
                  key={filter}
                  className={`rounded-full border px-3 py-2 text-sm ${
                    statusFilter === filter
                      ? "border-[rgba(27,33,31,0.75)] bg-[var(--foreground)] text-white"
                      : "border-[var(--line)] bg-white/75 text-[var(--foreground)] hover:-translate-y-0.5"
                  }`}
                  aria-pressed={statusFilter === filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                >
                  {statusLabel[filter]}
                  <span className="ml-2 text-xs opacity-70">
                    {propertyTaskCounts[filter]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {query ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-[var(--line)] bg-white/66 px-4 py-3 text-sm text-[var(--muted)]">
              <span className="section-kicker text-[var(--muted)]">Search scope</span>
              <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1 text-[var(--foreground)]">
                {deferredSearch}
              </span>
              <span>{totalMatches} matching item{totalMatches === 1 ? "" : "s"}</span>
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.95fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="section-kicker">Maintenance queue</p>
                  <p className="text-sm text-[var(--muted)]">
                    {visibleTasks.length} visible task{visibleTasks.length === 1 ? "" : "s"} for{" "}
                    {selectedPropertyMeta.name}
                  </p>
                </div>
                <div className="rounded-full border border-[var(--line)] bg-white/80 px-3 py-1 text-sm text-[var(--muted)]">
                  {totalMatches} total matches
                </div>
              </div>

              <div className="space-y-3">
                {visibleTasks.map((task) => {
                  const status = getTaskStatus(task, today);
                  const dueDate = parseISO(task.dueDate);
                  const dayDelta = getDayDelta(task, today);
                  const isLocked = status === "completed";

                  return (
                    <article
                      key={task.id}
                      className="lift-card rounded-[26px] border border-[var(--line)] bg-white/72 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${statusTone(
                                status,
                              )}`}
                            >
                              {status}
                            </span>
                            <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                              {task.area}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-xl font-semibold">{task.title}</h3>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                              {task.why}
                            </p>
                          </div>
                        </div>

                        <div className="min-w-0 rounded-[20px] border border-[var(--line)] bg-[var(--paper)] p-4 lg:min-w-56">
                          <p className="section-kicker">Due</p>
                          <p className="mt-2 text-lg font-semibold">
                            {format(dueDate, "MMM d, yyyy")}
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {dayDelta < 0
                              ? `${Math.abs(dayDelta)} day${Math.abs(dayDelta) === 1 ? "" : "s"} late`
                              : dayDelta === 0
                                ? "Due today"
                                : `${dayDelta} day${dayDelta === 1 ? "" : "s"} remaining`}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[var(--muted)]">
                          Cadence: {formatIntervalLabel(task.interval, task.unit)}
                          {task.lastCompleted
                            ? ` • last completed ${format(
                                parseISO(task.lastCompleted),
                                "MMM d",
                              )}`
                            : ""}
                        </p>

                        <button
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                            isLocked
                              ? "cursor-not-allowed border-[var(--line)] bg-[var(--paper)] text-[var(--muted)]"
                              : "border-[rgba(46,92,77,0.26)] bg-[var(--accent)] text-white hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(46,92,77,0.16)]"
                          }`}
                          disabled={isLocked}
                          type="button"
                          onClick={() => handleTaskComplete(task.id)}
                        >
                          <CheckCircle2 className="size-4" />
                          {isLocked ? "Recently completed" : "Mark complete"}
                        </button>
                      </div>
                    </article>
                  );
                })}

                {visibleTasks.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-[var(--line)] bg-white/60 px-5 py-10 text-center">
                    <p className="text-lg font-semibold">No tasks match this filter.</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Try another property, change the status chip, or broaden the search term.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <article className="lift-card rounded-[26px] border border-[var(--line)] bg-white/72 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="section-kicker">Appliance ledger</p>
                      <p className="mt-1 text-lg font-semibold">
                        {visibleAssets.length} tracked assets
                      </p>
                    </div>
                    <Wrench className="size-4 text-[var(--accent)]" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {visibleAssets.length > 0 ? (
                      visibleAssets.map((record) => (
                        <div
                          key={record.id}
                          className="rounded-[20px] border border-[var(--line)] bg-[var(--paper)] p-4"
                        >
                          <p className="font-semibold">{record.title}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">{record.subtitle}</p>
                          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                            {record.detail}
                          </p>
                        </div>
                      ))
                    ) : (
                      <EmptyCollection
                        title="No matching assets"
                        detail="Try a broader search or switch properties to inspect a different equipment profile."
                      />
                    )}
                  </div>
                </article>

                <article className="lift-card rounded-[26px] border border-[var(--line)] bg-white/72 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="section-kicker">Document vault</p>
                      <p className="mt-1 text-lg font-semibold">
                        {visibleDocuments.length} quick-retrieval files
                      </p>
                    </div>
                    <FileStack className="size-4 text-[var(--accent)]" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {visibleDocuments.length > 0 ? (
                      visibleDocuments.map((record) => (
                        <div
                          key={record.id}
                          className="rounded-[20px] border border-[var(--line)] bg-[var(--paper)] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{record.title}</p>
                              <p className="mt-1 text-sm text-[var(--muted)]">
                                {record.subtitle}
                              </p>
                            </div>
                            <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                              {record.tag}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                            {record.detail}
                          </p>
                        </div>
                      ))
                    ) : (
                      <EmptyCollection
                        title="No matching documents"
                        detail="Receipts, policies, and permits will appear here when the current filters line up."
                      />
                    )}
                  </div>
                </article>
              </div>

              <article className="lift-card rounded-[26px] border border-[var(--line)] bg-[var(--foreground)] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-kicker text-white/60">Issue watch</p>
                    <p className="mt-1 text-lg font-semibold">{visibleIssues.length} open notes</p>
                  </div>
                  <BadgeCheck className="size-4 text-white/80" />
                </div>

                <div className="mt-4 space-y-3">
                  {visibleIssues.length > 0 ? (
                    visibleIssues.map((record) => (
                      <div
                        key={record.id}
                        className="rounded-[20px] border border-white/12 bg-white/8 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{record.title}</p>
                            <p className="mt-1 text-sm text-white/70">{record.subtitle}</p>
                          </div>
                          <ArrowRight className="size-4 shrink-0 text-white/60" />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-white/72">
                          {record.detail}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyCollection
                      title="No issue notes in scope"
                      detail="Either this property is clear right now, or your search term is narrower than the current watch list."
                    />
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
