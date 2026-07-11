import ServiceCenterDiscovery from './ServiceCenterDiscovery.native';

export default function PartnerServiceCentersScreen(props) {
  return <ServiceCenterDiscovery {...props} partnerMode />;
}
