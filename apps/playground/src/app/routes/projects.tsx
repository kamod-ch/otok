import { fail, redirect, type OtokActionContext, type OtokContext, type OtokPageProps } from "@kamod-ch/otok/server";

type Project = {
  id: string;
  name: string;
  featured: boolean;
};

type ProjectData = {
  projects: Project[];
  projectActionCalls: number;
};

interface ProjectActionData {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
}

const projects: Project[] = [{ id: "otok", name: "Otok", featured: true }];
const projectActionCalls = new Map<string, number>();

function actionCounterKey({ hono }: Pick<OtokContext, "hono">): string {
  return hono.req.header("x-otok-test-id") ?? "default";
}

export const client = true;

export const chrome = () => ({
  title: "Projects",
  description: "Progressive route actions and HTML forms.",
});

export const head = () => ({
  title: "Projects | Otok Playground",
  description: "Progressive forms powered by Otok route actions.",
});

export const loader = (context: OtokContext) => ({
  projects,
  projectActionCalls: projectActionCalls.get(actionCounterKey(context)) ?? 0,
});

export async function action(context: OtokActionContext) {
  const { formData, method } = context;
  const counterKey = actionCounterKey(context);
  projectActionCalls.set(counterKey, (projectActionCalls.get(counterKey) ?? 0) + 1);
  const delayMs = Number(formData?.get("_otok_delay_ms") ?? 0);
  if (Number.isFinite(delayMs) && delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  const name = String(formData?.get("name") ?? "").trim();
  const intent = String(formData?.get("intent") ?? "create");

  if (intent === "draft") {
    fail(400, {
      message: "Draft validation",
      fieldErrors: { name: ["Draft requires a name"] },
      formErrors: ["Could not save draft."],
    });
  }

  if (method === "DELETE" || intent === "delete") {
    const id = String(formData?.get("id") ?? "");
    const index = projects.findIndex((project) => project.id === id);
    if (index >= 0) projects.splice(index, 1);
    redirect("/projects?deleted=1", 303);
  }

  if (!name) {
    fail(400, {
      message: "Validation failed",
      fieldErrors: { name: ["Name is required"] },
      formErrors: ["Please enter a project name."],
    });
  }

  const id =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "project";
  projects.unshift({ id: `${id}-${projects.length + 1}`, name, featured: formData?.get("featured") === "on" });
  redirect("/projects?created=1", 303);
}

export default function ProjectsPage({ data, actionData }: OtokPageProps<ProjectData>) {
  const result = actionData as ProjectActionData | undefined;

  return (
    <section class="space-y-8">
      <p data-testid="project-action-count" class="sr-only">
        {data.projectActionCalls}
      </p>

      <div>
        <p class="text-sm font-medium text-sky-600 dark:text-sky-300">Route actions</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Projects</h2>
        <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          This form works without JavaScript and is progressively enhanced by soft navigation when the client is loaded.
        </p>
      </div>

      {result?.formErrors?.map((error) => (
        <p class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" tabIndex={-1}>
          {error}
        </p>
      ))}

      <form
        method="post"
        class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
      >
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200" for="project-name">
          Project name
        </label>
        <input
          id="project-name"
          name="name"
          aria-invalid={Boolean(result?.fieldErrors?.name)}
          aria-describedby={result?.fieldErrors?.name ? "project-name-error" : undefined}
          class="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        {result?.fieldErrors?.name?.map((error) => (
          <p id="project-name-error" class="mt-2 text-sm text-red-600" role="alert" tabIndex={-1}>
            {error}
          </p>
        ))}
        <label class="mt-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input name="featured" type="checkbox" /> Featured
        </label>
        <div class="mt-4 flex flex-wrap gap-3">
          <button
            class="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
            name="intent"
            value="create"
            type="submit"
          >
            Save project
          </button>
          <button
            class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 dark:border-slate-600 dark:text-slate-100"
            name="intent"
            value="draft"
            type="submit"
          >
            Save draft
          </button>
        </div>
      </form>

      <form
        method="post"
        encType="multipart/form-data"
        class="rounded-3xl border border-dashed border-slate-300 p-4 text-sm dark:border-slate-700"
      >
        <p class="font-medium text-slate-800 dark:text-slate-100">Attachment (multipart progressive)</p>
        <input type="hidden" name="name" value="Upload project" />
        <input class="mt-2 block w-full text-sm" type="file" name="attachment" accept="text/plain" />
        <button
          class="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-white dark:bg-white dark:text-slate-900"
          name="intent"
          value="create"
          type="submit"
        >
          Upload project
        </button>
      </form>

      <ul class="grid gap-3" aria-label="Projects">
        {data.projects.map((project) => (
          <li
            class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950"
            key={project.id}
          >
            <span>
              {project.name} {project.featured ? <span class="text-xs text-sky-600">Featured</span> : null}
            </span>
            <form method="post">
              <input type="hidden" name="_method" value="delete" />
              <input type="hidden" name="id" value={project.id} />
              <button class="text-sm text-red-600" name="intent" value="delete">
                Delete
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form method="post" data-otok-no-nav="" class="text-sm text-slate-500">
        <input type="hidden" name="name" value="Opt out project" />
        <button name="intent" value="create">
          Native opt-out submit
        </button>
      </form>
    </section>
  );
}
