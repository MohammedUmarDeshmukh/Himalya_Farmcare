import { sortCropNames } from '../utils/cropOrder';

const fields = [
  ['seq', 'Spray Sequence', ['All', '2', '3+']],
];

export default function FilterPanel({
  filters,
  onChange,
  onSearch,
  cropOptions,
  isLoadingCrops,
  cropError,
  onRetryCrops,
  problemOptions,
  isLoadingProblems,
  problemError,
  onRetryProblems,
  methodOptions,
  isLoadingMethods,
  methodError,
  onRetryMethods,
}) {
  const sortedCrops = sortCropNames(cropOptions || []);
  const filterFields = [
    ['crop', 'Crop Type', ['All', ...sortedCrops]],
    ['problem', 'Problem Name', ['All', ...problemOptions]],
    ['method', 'Application Method', ['All', ...methodOptions]],
    ...fields,
  ];

  return (
    <div className="filters">
      {filterFields.map(([key, label, options]) => (
        <div className="field" key={key}>
          <label htmlFor={`filter-${key}`}>{label}</label>
          <select
            id={`filter-${key}`}
            value={filters[key]}
            disabled={
              (key === 'crop' && isLoadingCrops) ||
              (key === 'problem' && isLoadingProblems) ||
              (key === 'method' && isLoadingMethods)
            }
            onChange={(event) => onChange(key, event.target.value)}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {key === 'crop' && isLoadingCrops && (
            <small className="filter-state" role="status">
              Loading crop options…
            </small>
          )}
          {key === 'crop' && !isLoadingCrops && cropError && (
            <span className="filter-state filter-error" role="alert">
              {cropError} <button type="button" onClick={onRetryCrops}>Retry</button>
            </span>
          )}
          {key === 'crop' && !isLoadingCrops && !cropError && sortedCrops.length === 0 && (
            <small className="filter-state" role="status">
              No crop options are available.
            </small>
          )}
          {key === 'problem' && isLoadingProblems && (
            <small className="filter-state" role="status">
              Loading problem options…
            </small>
          )}
          {key === 'problem' && !isLoadingProblems && problemError && (
            <span className="filter-state filter-error" role="alert">
              {problemError} <button type="button" onClick={onRetryProblems}>Retry</button>
            </span>
          )}
          {key === 'problem' && !isLoadingProblems && !problemError && problemOptions.length === 0 && (
            <small className="filter-state" role="status">
              No problem options are available.
            </small>
          )}
          {key === 'method' && isLoadingMethods && (
            <small className="filter-state" role="status">
              Loading application methods…
            </small>
          )}
          {key === 'method' && !isLoadingMethods && methodError && (
            <span className="filter-state filter-error" role="alert">
              {methodError} <button type="button" onClick={onRetryMethods}>Retry</button>
            </span>
          )}
          {key === 'method' && !isLoadingMethods && !methodError && methodOptions.length === 0 && (
            <small className="filter-state" role="status">
              No application methods are available.
            </small>
          )}
        </div>
      ))}
      <button type="button" onClick={onSearch}>
        Search
      </button>
    </div>
  );
}
