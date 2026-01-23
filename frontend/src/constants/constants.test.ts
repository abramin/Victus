import { describe, it, expect } from 'vitest';
import {
  CARB_KCAL_PER_G,
  PROTEIN_KCAL_PER_G,
  FAT_KCAL_PER_G,
  FRUIT_CARBS_PERCENT_WEIGHT,
  VEGGIE_CARBS_PERCENT_WEIGHT,
  MALTODEXTRIN_CARB_PERCENT,
  WHEY_PROTEIN_PERCENT,
  COLLAGEN_PROTEIN_PERCENT,
} from './index';

describe('Calorie constants (Standard Atwater Factors)', () => {
  it('should use 4 kcal/g for carbohydrates', () => {
    expect(CARB_KCAL_PER_G).toBe(4.0);
  });

  it('should use 4 kcal/g for protein', () => {
    expect(PROTEIN_KCAL_PER_G).toBe(4.0);
  });

  it('should use 9 kcal/g for fat', () => {
    expect(FAT_KCAL_PER_G).toBe(9.0);
  });

  it('should calculate correct calories for a sample meal', () => {
    const carbsG = 200;
    const proteinG = 150;
    const fatsG = 80;

    const totalCalories =
      carbsG * CARB_KCAL_PER_G +
      proteinG * PROTEIN_KCAL_PER_G +
      fatsG * FAT_KCAL_PER_G;

    // 200*4 + 150*4 + 80*9 = 800 + 600 + 720 = 2120
    expect(totalCalories).toBe(2120);
  });
});

describe('Macro calculation constants', () => {
  it('should use 10% for fruit carbohydrate content', () => {
    expect(FRUIT_CARBS_PERCENT_WEIGHT).toBe(0.10);
  });

  it('should use 3% for vegetable carbohydrate content', () => {
    expect(VEGGIE_CARBS_PERCENT_WEIGHT).toBe(0.03);
  });

  it('should use 96% for maltodextrin carbohydrate content', () => {
    expect(MALTODEXTRIN_CARB_PERCENT).toBe(0.96);
  });

  it('should use 88% for whey protein content', () => {
    expect(WHEY_PROTEIN_PERCENT).toBe(0.88);
  });

  it('should use 90% for collagen protein content', () => {
    expect(COLLAGEN_PROTEIN_PERCENT).toBe(0.90);
  });

  it('should calculate correct fruit carbs for 600g of fruit', () => {
    const fruitG = 600;
    const fruitCarbs = fruitG * FRUIT_CARBS_PERCENT_WEIGHT;
    expect(fruitCarbs).toBe(60); // 600 * 0.10 = 60g carbs
  });

  it('should calculate correct veggie carbs for 500g of vegetables', () => {
    const veggieG = 500;
    const veggieCarbs = veggieG * VEGGIE_CARBS_PERCENT_WEIGHT;
    expect(veggieCarbs).toBe(15); // 500 * 0.03 = 15g carbs
  });
});
