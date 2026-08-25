export const listSensorDataByDevice = /* GraphQL */ `
  query ListSensorDataByDevice(
    $deviceID: String!
    $startTimestamp: String
    $endTimestamp: String
    $limit: Int
    $nextToken: String
  ) {
    listSensorDataByDevice(
      deviceID: $deviceID
      startTimestamp: $startTimestamp
      endTimestamp: $endTimestamp
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        deviceID
        timestamp
        imageKeys
        temperature
        humidity
        i_v_light
        u_v_light
        temperature_hq
        humidity_hq
        stem
        fruit_diagram
      }
      nextToken
    }
  }
`;