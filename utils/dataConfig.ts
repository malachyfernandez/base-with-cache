import { Privacy } from "../hooks/useUserVariable";

export type DataVariableConfig<T = any> = {
  type: "variable";
  defaultValue?: T;
  privacy?: Privacy;
  filterKey?: keyof T | string;
  searchKeys?: (keyof T | string)[];
  sortKey?: keyof T | string;
  unloadedChangesThreshold?: number;
};

export type DataListConfig<T = any> = {
  type: "list";
  defaultValue?: T;
  privacy?: Privacy;
  filterKey?: keyof T | string;
  searchKeys?: (keyof T | string)[];
  sortKey?: keyof T | string;
  unloadedChangesThreshold?: number;
};

export type DataConfigType = {
  [key: string]: DataVariableConfig | DataListConfig;
};

/**
 * Central dictionary for all userVariables.
 * Defining them here prevents mismatched configurations across the app.
 */
export const DATA_CONFIG: DataConfigType = {
  userData: {
    type: "variable",
    privacy: "PUBLIC",
    defaultValue: { name: "", email: "", userId: "" },
    searchKeys: ["name"],
  },
  posts: {
    type: "variable",
    privacy: "PUBLIC",
    defaultValue: {},
  },
};
