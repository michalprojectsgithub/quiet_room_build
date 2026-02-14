import React from 'react';

interface CategoryFilterProps {
  selectedCategory: string;
  categories: { [key: string]: string };
  onCategoryChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  categories,
  onCategoryChange
}) => {
  return (
    <div className="inspiration-category-filter">
      <label className="inspiration-category-label">
        Category:
      </label>
      <select
        value={selectedCategory}
        onChange={onCategoryChange}
        className="inspiration-category-select"
      >
        {Object.entries(categories).map(([key]) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CategoryFilter;

