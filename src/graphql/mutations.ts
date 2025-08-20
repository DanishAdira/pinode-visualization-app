// src/graphql/mutations.ts
export const createCsvExport = /* GraphQL */ `
  mutation CreateCsvExport(
    $deviceID: String!
    $startTimestamp: String!
    $endTimestamp: String!
  ) {
    createCsvExport(
      deviceID: $deviceID
      startTimestamp: $startTimestamp
      endTimestamp: $endTimestamp
    )
  }
`;