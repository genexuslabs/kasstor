import { beforeEach, describe, expect, test } from "vitest";
import { TypeAhead } from "..";

const TEST_OPTIONS = [
  "Apple",
  "Banana",
  "Blueberry",
  "Boysenberry",
  "Cherry",
  "Cranberry",
  "Durian",
  "Eggplant",
  "Fig",
  "Grape",
  "Guava",
  "Huckleberry"
] as const;

type AvailableOptions = (typeof TEST_OPTIONS)[number];

const EXPECTED_MATCHES_WHEN_NO_ACTIVE_ITEM: {
  character: string;
  expected: AvailableOptions;
}[] = [
  { character: "A", expected: "Apple" },
  { character: "B", expected: "Banana" },
  { character: "C", expected: "Cherry" },
  { character: "D", expected: "Durian" },
  { character: "E", expected: "Eggplant" },
  { character: "F", expected: "Fig" },
  { character: "G", expected: "Grape" },
  { character: "H", expected: "Huckleberry" }
];

const EXPECTED_MATCHES_FOR_ANY_ACTIVE_ITEMS: {
  character: string;
  expected: AvailableOptions;
  activeItem: AvailableOptions;
}[] = [];

// Since "Apple" is the only value that start with the "A" letter, it must always be selected
TEST_OPTIONS.forEach(option =>
  EXPECTED_MATCHES_FOR_ANY_ACTIVE_ITEMS.push({
    character: "A",
    expected: "Apple",
    activeItem: option
  })
);

// Since "Durian" is the only value that start with the "D" letter, it must always be selected
TEST_OPTIONS.forEach(option =>
  EXPECTED_MATCHES_FOR_ANY_ACTIVE_ITEMS.push({
    character: "D",
    expected: "Durian",
    activeItem: option
  })
);

// Since "Eggplant" is the only value that start with the "E" letter, it must always be selected
TEST_OPTIONS.forEach(option =>
  EXPECTED_MATCHES_FOR_ANY_ACTIVE_ITEMS.push({
    character: "E",
    expected: "Eggplant",
    activeItem: option
  })
);

// Since "Fig" is the only value that start with the "F" letter, it must always be selected
TEST_OPTIONS.forEach(option =>
  EXPECTED_MATCHES_FOR_ANY_ACTIVE_ITEMS.push({
    character: "F",
    expected: "Fig",
    activeItem: option
  })
);

// Since "Huckleberry" is the only value that start with the "H" letter, it must always be selected
TEST_OPTIONS.forEach(option =>
  EXPECTED_MATCHES_FOR_ANY_ACTIVE_ITEMS.push({
    character: "H",
    expected: "Huckleberry",
    activeItem: option
  })
);

const EXPECTED_MATCHES_TO_ITERATE_OVER_THE_SAME_START_LETTER: {
  character: string;
  expected: AvailableOptions;
  activeItem: AvailableOptions;
}[] = [
  { character: "B", expected: "Blueberry", activeItem: "Banana" },
  { character: "B", expected: "Boysenberry", activeItem: "Blueberry" },
  { character: "B", expected: "Banana", activeItem: "Boysenberry" },
  { character: "C", expected: "Cranberry", activeItem: "Cherry" },
  { character: "C", expected: "Cherry", activeItem: "Cranberry" },
  { character: "G", expected: "Guava", activeItem: "Grape" },
  { character: "G", expected: "Grape", activeItem: "Guava" }
];

const LETTERS_WITH_NO_COINCIDENCES = [
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "Ñ",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z"
];

let typeAhead: TypeAhead<number>;

const delay = (timeout: number) =>
  new Promise(resolve => setTimeout(resolve, timeout));

describe("[type-ahead]", () => {
  describe("[plain array]", () => {
    describe("[empty query]", () => {
      beforeEach(() => {
        typeAhead = new TypeAhead({
          getCaptionFromIndex: index => TEST_OPTIONS[index],
          getFirstIndex: () => 0,
          getNextIndex: index =>
            index === TEST_OPTIONS.length - 1 ? 0 : index + 1,
          isSameIndex: (a, b) => a === b
        });
      });

      EXPECTED_MATCHES_WHEN_NO_ACTIVE_ITEM.forEach(
        ({ character, expected }) => {
          const expectedIndex = TEST_OPTIONS.indexOf(expected);

          test(`should return "${expected}" with the index ${expectedIndex} when searching for "${character}" with no active item`, () =>
            expect(typeAhead.search(character, -1)).toEqual(expectedIndex));
        }
      );

      EXPECTED_MATCHES_FOR_ANY_ACTIVE_ITEMS.forEach(
        ({ character, expected, activeItem }) => {
          const expectedIndex = TEST_OPTIONS.indexOf(expected);
          const activeItemIndex = TEST_OPTIONS.indexOf(activeItem);

          test(`when the start letter is "${character}" it should return "${expected}" with the index ${expectedIndex}, because it is the only word that starts with "${character}"; using { item: ${activeItem}, index: ${activeItemIndex} } as the active item`, () =>
            expect(typeAhead.search(character, activeItemIndex)).toEqual(
              expectedIndex
            ));
        }
      );

      EXPECTED_MATCHES_TO_ITERATE_OVER_THE_SAME_START_LETTER.forEach(
        ({ character, expected, activeItem }) => {
          const expectedIndex = TEST_OPTIONS.indexOf(expected);
          const activeItemIndex = TEST_OPTIONS.indexOf(activeItem);

          test(`should select the next word that start with "${character}"; using { item: ${activeItem}, index: ${activeItemIndex} } as the active item`, () =>
            expect(typeAhead.search(character, activeItemIndex)).toEqual(
              expectedIndex
            ));
        }
      );

      LETTERS_WITH_NO_COINCIDENCES.forEach(letter => {
        test(`should return null, because the "${letter}" letter has no coincidences`, () =>
          expect(typeAhead.search(letter, -1)).toEqual(null));
      });

      TEST_OPTIONS.forEach(activeItem => {
        const activeItemIndex = TEST_OPTIONS.indexOf(activeItem);

        test(`should return null, because the "N" letter has no coincidences, even if there is an active item { item: ${activeItem}, index: ${activeItemIndex} }`, () =>
          expect(typeAhead.search("N", activeItemIndex)).toEqual(null));
      });
    });

    describe.todo("should ignore the casing");

    describe("[querying words]", () => {
      beforeEach(() => {
        typeAhead = new TypeAhead({
          getCaptionFromIndex: index => TEST_OPTIONS[index],
          getFirstIndex: () => 0,
          getNextIndex: index =>
            index === TEST_OPTIONS.length - 1 ? 0 : index + 1,
          isSameIndex: (a, b) => a === b
        });
      });

      test(`should find the "Apple" word when typing "A", "p", "p" and it has no active item`, () => {
        const indexA = typeAhead.search("A", -1)!;
        expect(indexA).toEqual(0);

        const indexB = typeAhead.search("p", indexA)!;
        expect(indexB).toEqual(0);

        const indexC = typeAhead.search("p", indexB);
        expect(indexC).toEqual(0);
      });

      test(`should find the "Banana" word when typing "B", "a", "n" and it has no active item`, () => {
        const indexA = typeAhead.search("B", -1)!;
        expect(indexA).toEqual(1);

        const indexB = typeAhead.search("a", indexA)!;
        expect(indexB).toEqual(1);

        const indexC = typeAhead.search("n", indexB);
        expect(indexC).toEqual(1);
      });

      test(`should find the "Blueberry" word when typing "B", "l", "u" and it has no active item`, () => {
        const indexA = typeAhead.search("B", -1)!;
        expect(indexA).toEqual(1);

        const indexB = typeAhead.search("l", indexA)!;
        expect(indexB).toEqual(2);

        const indexC = typeAhead.search("u", indexB);
        expect(indexC).toEqual(2);
      });

      test(`should find the "Boysenberry" word when typing "B", "b", "b" and it has no active item`, () => {
        const indexA = typeAhead.search("B", -1)!;
        expect(indexA).toEqual(1);

        const indexB = typeAhead.search("b", indexA)!;
        expect(indexB).toEqual(2);

        const indexC = typeAhead.search("b", indexB);
        expect(indexC).toEqual(3);
      });

      test(`should find the "Banana" word when typing "B", "b", "b", "B" and it has no active item`, () => {
        const indexA = typeAhead.search("B", -1)!;
        expect(indexA).toEqual(1);

        const indexB = typeAhead.search("b", indexA)!;
        expect(indexB).toEqual(2);

        const indexC = typeAhead.search("b", indexB)!;
        expect(indexC).toEqual(3);

        const indexD = typeAhead.search("B", indexC);
        expect(indexD).toEqual(1);
      });

      test(`should return null when typing "c", "c", "c", "r", instead of finding the "Cranberry" word; it has no active item`, () => {
        const indexA = typeAhead.search("c", -1)!;
        expect(indexA).toEqual(4);

        const indexB = typeAhead.search("c", indexA)!;
        expect(indexB).toEqual(5);

        const indexC = typeAhead.search("c", indexB)!;
        expect(indexC).toEqual(4);

        const indexD = typeAhead.search("r", indexC)!;
        expect(indexD).toEqual(null);
      });

      test(`should find the "Guava" word when typing "G", "u", "z" and it has no active item`, () => {
        const indexA = typeAhead.search("G", -1)!;
        expect(indexA).toEqual(9);

        const indexB = typeAhead.search("u", indexA)!;
        expect(indexB).toEqual(10);

        const indexC = typeAhead.search("z", indexB);
        expect(indexC).toEqual(null);
      });
    });

    describe("[querying words with delay]", () => {
      beforeEach(() => {
        typeAhead = new TypeAhead({
          getCaptionFromIndex: index => TEST_OPTIONS[index],
          getFirstIndex: () => 0,
          getNextIndex: index =>
            index === TEST_OPTIONS.length - 1 ? 0 : index + 1,
          isSameIndex: (a, b) => a === b
        });
      });

      test(`the default delay should be 512ms`, () =>
        expect(typeAhead.delay).toBe(512));

      test(`the delay property should work`, async () => {
        typeAhead.delay = 10;

        const indexA = typeAhead.search("A", -1)!;
        expect(indexA).toEqual(0);

        // No coincidence
        const indexB = typeAhead.search("b", indexA)!;
        expect(indexB).toEqual(null);

        // After this, the query is reset
        await delay(15);

        // So searching the "a" letter should return "Apple"
        const indexC = typeAhead.search("a", indexA)!;
        expect(indexC).toEqual(0);
      });
    });
  });
});
