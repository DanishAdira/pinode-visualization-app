// src/graphql/queries.ts

export const listSensorData = /* GraphQL */ `
query ListSensorData(
    $limit: Int
    $nextToken: String
  ) {
    listSensorData(limit: $limit, nextToken: $nextToken) {
      items {
        deviceID
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