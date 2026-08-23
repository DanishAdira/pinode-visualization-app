export const listSensorDataByDevice = /* GraphQL */ `
  query ListSensorDataByDevice($deviceID: String!, $limit: Int, $nextToken: String) {
    listSensorDataByDevice(deviceID: $deviceID, limit: $limit, nextToken: $nextToken) {
      items {
        deviceID fieldID plantID sectionID plantNumber
        timestamp timestampLocal
        imageKeys
        temperature humidity i_v_light u_v_light
      }
      nextToken
    }
  }
`;