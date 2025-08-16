// src/graphql/queries.ts

export const listSensorData = /* GraphQL */ `
  query ListSensorData(
    $filter: ModelSensorDataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSensorData(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        deviceId
        timestamp
        payload {
          data {
            fruit_diagram
            humidity
            humidity_hq
            i_v_light
            stem
            temperature
            temperature_hq
            u_v_light
          }
        }
      }
      nextToken
    }
  }
`;