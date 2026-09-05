import jobs from "../data/jobs.json";
import hires from "../data/ hires.json";
import headcount from "../data/headcount.json";
import recruiters from "../data/recruiters.json";

export function loadDataset() {
  return {
    jobs,
    hires,
    headcount,
    recruiters,
  };
}

export type Dataset = ReturnType<typeof loadDataset>;