import test from 'node:test';
import assert from 'node:assert/strict';
import { formatoCorto } from './format.js';

test('formatoCorto abrevia miles y millones sin redondear hacia arriba', () => {
  assert.equal(formatoCorto(0), '0');
  assert.equal(formatoCorto(999.9), '999');
  assert.equal(formatoCorto(1000), '1K');
  assert.equal(formatoCorto(1250), '1,2K');
  assert.equal(formatoCorto(1299), '1,2K');
  assert.equal(formatoCorto(3_400_000), '3,4M');
  assert.equal(formatoCorto(undefined), '0');
});
