import React, { useState, useLayoutEffect, useRef, useEffect } from "react";
import { createRoot, Root } from "react-dom/client";
import { FluidProvider } from "@/lib/fluid-provider";
import { untitleduiIcons } from "@/lib/icons-untitledui";
import {
  Combobox,
  ComboboxInput,
  ComboboxChips,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ColorPickerPopover } from "@/components/ui/color-picker";
import { InputCopy } from "@/components/ui/input-copy";
import {
  CommandMenu,
  CommandMenuInput,
  CommandMenuList,
  CommandMenuEmpty,
  CommandMenuFooter,
} from "@/components/ui/command-menu";


type Context = {
  getState: () => any;
  save: () => Promise<any>;
  toast: (s: string) => void;
  open: (title: string, html: string, options?: any) => void;
  dialog: HTMLDialogElement;
};
const roots = new Map<HTMLElement, Root>();
const handled = new WeakSet<Element>();
function mount(host: HTMLElement, element: React.ReactNode) {
  host.classList.add("fluid-ui");
  const root = createRoot(host);
  roots.set(host, root);
  root.render(
    <FluidProvider shape="rounded" size="compact" icons={untitleduiIcons}>
      {element}
    </FluidProvider>,
  );
}
function after(source: HTMLElement) {
  const host = document.createElement("div");
  source.after(host);
  return host;
}
function portal(source: HTMLElement) {
  const parent = source.closest("dialog") || document.body;
  let node = parent.querySelector<HTMLElement>(":scope > .fluid-portals");
  if (!node) {
    node = document.createElement("div");
    node.className = "fluid-ui fluid-portals";
    parent.append(node);
  }
  return node;
}
function emit(source: HTMLInputElement | HTMLSelectElement, value: string) {
  source.value = value;
  source.dispatchEvent(new Event("input", { bubbles: true }));
  source.dispatchEvent(new Event("change", { bubbles: true }));
}
function useSource(
  source: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) {
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh((n) => n + 1);
    document.addEventListener("change", update);
    document.addEventListener("fluid:refresh", update);
    const observer = new MutationObserver(update);
    observer.observe(source, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    return () => {
      document.removeEventListener("change", update);
      document.removeEventListener("fluid:refresh", update);
      observer.disconnect();
    };
  }, [source]);
  return source.value;
}
function Slot({ node }: { node: HTMLElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.append(node);
  }, [node]);
  return <div className="legacy-slot" ref={ref} />;
}
function labelFor(source: HTMLElement) {
  const label = source.closest("label")?.cloneNode(true) as HTMLElement | null;
  label
    ?.querySelectorAll("input,select,textarea,.fluid-ui,.thrive-select")
    .forEach((n) => n.remove());
  return (
    label?.textContent?.trim() ||
    source.getAttribute("aria-label") ||
    source.getAttribute("name") ||
    "Choose an option"
  );
}
function Picker({
  source,
  container,
}: {
  source: HTMLSelectElement;
  container: HTMLElement;
}) {
  const value = useSource(source);
  const items = Array.from(source.options).map((o) => ({
    value: o.value || "__empty",
    label: o.textContent || "",
  }));
  return (
    <Combobox
      items={items}
      value={value || "__empty"}
      disabled={source.matches(":disabled")}
      onValueChange={(v) => emit(source, v === "__empty" ? "" : v)}
    >
      <ComboboxInput aria-label={labelFor(source)} />
      <ComboboxContent container={container}>
        <ComboboxList>
          {(item: any) => (
            <ComboboxItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>No matches</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
function Service({
  source,
  container,
  ctx,
}: {
  source: HTMLInputElement;
  container: HTMLElement;
  ctx: Context;
}) {
  const value = useSource(source);
  const [extra, setExtra] = useState<string[]>([]);
  const names = [
    ...new Set<string>(
      [
        source.value,
        ...(ctx.getState().services || [])
          .filter((s: any) => !s.archived)
          .map((s: any) => s.name),
        ...extra,
      ].filter(Boolean),
    ),
  ];
  return (
    <Combobox
      items={names}
      value={value}
      onCreate={(q) => {
        q = q.trim().slice(0, source.maxLength > 0 ? source.maxLength : 80);
        setExtra((a) => [...a, q]);
        return q;
      }}
      onValueChange={(v) => emit(source, v)}
    >
      <ComboboxInput
        clearable
        aria-label={labelFor(source)}
        placeholder="Choose or enter a service…"
      />
      <ComboboxContent container={container}>
        <ComboboxList>
          {(item: any) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>No services found</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
function Tags({
  source,
  container,
  ctx,
}: {
  source: HTMLElement;
  container: HTMLElement;
  ctx: Context;
}) {
  const input = source.querySelector("input[type=hidden]") as HTMLInputElement;
  const [selected, setSelected] = useState<string[]>(
    JSON.parse(input.value || "[]"),
  );
  const [created, setCreated] = useState<string[]>([]);
  const state = ctx.getState();
  const values = [
    ...new Set<string>([
      "Client",
      "Lead",
      ...state.clients.flatMap((x: any) => x.tags || []),
      ...state.projects.flatMap((x: any) => x.tags || []),
      ...selected,
      ...created,
    ]),
  ];
  const items = values.map((value) => ({ value, label: value }));
  return (
    <Combobox
      multiple
      items={items}
      value={selected}
      onCreate={(q) => {
        q = q.trim().slice(0, 60);
        if (!q) return;
        const existing = values.find(
          (v) => v.toLowerCase() === q.toLowerCase(),
        );
        const value = existing || q;
        setCreated((a) => [...a, value]);
        return { value, label: value };
      }}
      onValueChange={(next) => {
        if (next.length > 20) {
          ctx.toast("Use up to 20 tags.");
          return;
        }
        setSelected(next);
        input.value = JSON.stringify(next);
        if (source.dataset.id) {
          const records =
            ctx.getState()[
              source.dataset.entity === "client" ? "clients" : "projects"
            ];
          const record = records.find((r: any) => r.id === source.dataset.id);
          if (record) {
            record.tags = next;
            void ctx.save().catch((e: Error) => ctx.toast(e.message));
          }
        }
      }}
    >
      <ComboboxChips aria-label="Tags" placeholder="Search or create tags…" />
      <ComboboxContent container={container}>
        <ComboboxList>
          {(item: any) => (
            <ComboboxItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>No matching tags</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
function Disclosure({
  body,
  title,
  summary,
  initial,
}: {
  body: HTMLElement;
  title: string;
  summary: string;
  initial: boolean;
}) {
  const [value, setValue] = useState(initial ? "section" : "");
  const [currentSummary, setCurrentSummary] = useState(
    body.dataset.summary || summary,
  );
  useEffect(() => {
    const invalid = () => setValue("section");
    const observer = new MutationObserver(() =>
      setCurrentSummary(body.dataset.summary || summary),
    );
    observer.observe(body, { attributes: true, attributeFilter: ["data-summary"] });
    body.addEventListener("invalid", invalid, true);
    return () => {
      observer.disconnect();
      body.removeEventListener("invalid", invalid, true);
    };
  }, [body, summary]);
  return (
    <Accordion className="w-full" value={value} onValueChange={setValue}>
      <AccordionItem value="section">
        <AccordionTrigger>
          <span className="fluid-section-label">
            <span className="fluid-section-title">{title}</span>
            <span className="fluid-section-summary">{currentSummary}</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Slot node={body} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
function Color({
  source,
  container,
}: {
  source: HTMLInputElement;
  container: HTMLElement;
}) {
  const value = useSource(source);
  return (
    <ColorPickerPopover
      container={container}
      hideAlpha
      value={value}
      triggerLabel={labelFor(source)}
      triggerClassName={source.closest(".settings-page") ? "settings-color-trigger" : undefined}
      format="hex"
      swatches={[
        "#3f6236",
        "#91e5dc",
        "#222222",
        "#ffffff",
        "#5085b5",
        "#9573b9",
      ]}
      onValueChange={(_, parsed) => emit(source, parsed.hex.slice(0, 7))}
    />
  );
}
function Copy({ source }: { source: HTMLInputElement | HTMLTextAreaElement }) {
  const value = useSource(source);
  return (
    <InputCopy
      value={value}
      label={
        source.id === "form-embed-code"
          ? "Embed code"
          : source.id === "client-share-url"
            ? "Share link"
            : labelFor(source)
      }
      variant="button"
    />
  );
}
export function initFluid(ctx: Context) {
  function enhance() {
    for (const [host, root] of roots)
      if (!host.isConnected) {
        root.unmount();
        roots.delete(host);
      }
    document
      .querySelectorAll<HTMLDetailsElement>(
        "#record-client-form .settings-section,#record-project-form .settings-section",
      )
      .forEach((source) => {
        if (handled.has(source)) return;
        handled.add(source);
        const title = source.querySelector("summary strong")?.textContent || "";
        const summary = source.querySelector("summary span")?.textContent || "";
        const body = source.querySelector<HTMLElement>(
          ".settings-section-body",
        )!;
        const host = after(source);
        host.className = "fluid-disclosure";
        source.remove();
        mount(
          host,
          <Disclosure
            body={body}
            title={title}
            summary={summary}
            initial={source.open}
          />,
        );
      });
    document
      .querySelectorAll<HTMLSelectElement>(
        "#record-project-form select,#record-client-form select,#workspace-settings select,#settings-content select",
      )
      .forEach((source) => {
        if (handled.has(source)) return;
        handled.add(source);
        source.dataset.nativeSelect = "";
        const host = after(source);
        source.classList.add("fluid-source");
        source.setAttribute("aria-hidden", "true");
        source.tabIndex = -1;
        source.addEventListener("invalid", () =>
          host.querySelector("input")?.focus(),
        );
        mount(host, <Picker source={source} container={portal(source)} />);
      });
    document
      .querySelectorAll<HTMLInputElement>(
        "#record-project-form input[name=service],#workspace-settings input[name=service],#record-client-form input[name=tag],#settings-page-form input[name=service]",
      )
      .forEach((source) => {
        if (handled.has(source)) return;
        handled.add(source);
        const host = after(source);
        source.hidden = true;
        mount(
          host,
          <Service source={source} container={portal(source)} ctx={ctx} />,
        );
      });
    document.querySelectorAll<HTMLElement>(".tag-picker").forEach((source) => {
      if (handled.has(source)) return;
      handled.add(source);
      const host = after(source);
      host.classList.add("fluid-tags");
      source.hidden = true;
      mount(
        host,
        <Tags source={source} container={portal(source)} ctx={ctx} />,
      );
    });
    document
      .querySelectorAll<HTMLInputElement>("input[type=color]")
      .forEach((source) => {
        if (
          handled.has(source) ||
          source.closest(".fluid-ui:not(.fluid-disclosure)")
        )
          return;
        handled.add(source);
        const host = after(source);
        source.hidden = true;
        mount(host, <Color source={source} container={portal(source)} />);
      });
    document
      .querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement
      >("#client-share-url,#form-embed-code,input[readonly]")
      .forEach((source) => {
        if (
          handled.has(source) ||
          source.closest(".fluid-ui") ||
          !/^(https?:|<iframe|<script)/.test(source.value)
        )
          return;
        handled.add(source);
        const host = after(source);
        source.hidden = true;
        (source.closest(".dialog-body") || source.parentElement)
          ?.querySelectorAll<HTMLElement>(
            '[data-action="share-copy"],[data-action="share-embed-copy"],[data-action="mcp-copy-endpoint"]',
          )
          .forEach((n) => (n.hidden = true));
        mount(host, <Copy source={source} />);
      });
    // Keep the original tab buttons and their native layout/event handlers.

  }
  let pending = false;
  const observer = new MutationObserver((records) => {
    if (
      records.every(
        (r) =>
          (r.target as HTMLElement).closest?.(".fluid-ui") &&
          !Array.from(r.addedNodes).some(
            (n) =>
              n instanceof HTMLElement &&
              (n.matches(".settings-section-body") ||
                n.querySelector(".settings-section-body")),
          ),
      )
    )
      return;
    if (!pending) {
      pending = true;
      queueMicrotask(() => {
        pending = false;
        enhance();
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener(
    "invalid",
    (e) => {
      const target = e.target as HTMLElement;
      if (target.offsetParent === null) {
        e.preventDefault();
        requestAnimationFrame(() => {
          const focus = target.classList.contains("fluid-source")
            ? target.nextElementSibling?.querySelector("input")
            : target;
          focus?.focus();
        });
      }
    },
    true,
  );
  document.addEventListener("change", () =>
    setTimeout(() => document.dispatchEvent(new Event("fluid:refresh")), 0),
  );
  const theme = () =>
    document.documentElement.classList.toggle(
      "dark",
      document.documentElement.dataset.theme === "dark",
    );
  new MutationObserver(theme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  theme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("thrive-theme"))
      document.documentElement.dataset.theme = e.matches ? "dark" : "light";
  });
  enhance();
  return {
    search() {
      const state = ctx.getState();
      const action = (name: string, id?: string, page?: string) => {
        ctx.dialog.close();
        const button = document.createElement("button");
        button.hidden = true;
        button.dataset.action = name;
        if (id) button.dataset.id = id;
        if (page) button.dataset.page = page;
        document.body.append(button);
        button.click();
        button.remove();
      };
      const items = [
        ...["client", "project", "proposal", "contract", "form"].map((kind) => ({
          value: "new-" + kind,
          label: "New " + kind,
          group: "Create",
          onSelect: () => action("new-" + kind),
        })),
        ...[
          "overview",
          "notifications",
          "proposals",
          "contracts",
          "clients",
          "projects",
          "time",
          "messages",
          "forms",
          "scheduling",
          "invoices",
          "workflows",
        ].map((page) => ({
          value: "go-" + page,
          label:
            page === "overview"
              ? "Home"
              : page === "messages" ? "Emails" : page[0].toUpperCase() + page.slice(1),
          group: "Navigate",
          onSelect: () => action("navigate", undefined, page),
        })),
        {
          value: "settings",
          label: "Workspace settings",
          group: "Settings",
          onSelect: () => action("workspace-settings"),
        },
        ...["clients", "projects", "documents", "forms", "invoices"].flatMap(
          (type) =>
            (state[type] || [])
              .filter((r: any) => !r.archived)
              .map((r: any) => ({
                value: type + "-" + r.id,
                label: r.name || r.title || r.number,
                group: type === "documents" ? (r.kind === "proposal" ? "Proposals" : ["contract", "agreement"].includes(r.kind) ? "Contracts" : "Reference material") : type[0].toUpperCase() + type.slice(1),
                onSelect: () =>
                  action(
                    (
                      {
                        clients: "client",
                        projects: "project",
                        documents: "document",
                        forms: "edit-form",
                        invoices: "invoice",
                      } as any
                    )[type],
                    r.id,
                  ),
              })),
        ),
      ];
      ctx.open("Search workspace", '<div id="fluid-command"></div>');
      ctx.dialog.classList.add("fluid-command-dialog");
      mount(
        document.querySelector("#fluid-command")!,
        <CommandMenu items={items}>
          <CommandMenuInput
            autoFocus
            placeholder="Search or jump to…"
            aria-label="Search workspace"
          />
          <CommandMenuList>
            <CommandMenuEmpty>No results. Try another name.</CommandMenuEmpty>
          </CommandMenuList>
          <CommandMenuFooter />
        </CommandMenu>,
      );
    },
  };
}
