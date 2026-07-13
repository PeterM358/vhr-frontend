import ServiceCenterDiscovery from './ServiceCenterDiscovery.native';

export default function ShopMapScreen(props) {
  return <ServiceCenterDiscovery {...props} partnerMode={false} />;
}
