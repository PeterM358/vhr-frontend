import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  // General background with subtle color
  background: {
    flex: 1,
    backgroundColor: '#f6f8fa',
  },

  // Page container with constrained width
  overlay: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    maxWidth: 900,
    alignSelf: 'center',
  },

  // Big page title
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#222',
  },

  // Section titles in forms / cards
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },

  // Input labels
  label: {
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 6,
    fontSize: 16,
    color: '#555',
    alignSelf: 'flex-start',
    maxWidth: 400,
  },

  // Form input boxes
  formInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    fontSize: 16,
  },

  // Button styling
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: 16,
    cursor: 'pointer',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // Tab bar for nav
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },

  activeTab: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    color: '#fff',
    cursor: 'pointer',
  },

  inactiveTab: {
    backgroundColor: '#eaeaea',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    color: '#333',
    cursor: 'pointer',
  },

  // Items in lists
  listItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },

  itemBox: {
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
    backgroundColor: '#fff',
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },

  subText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
  },

  // Price text
  price: {
    color: 'green',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    textAlign: 'center',
  },

  // Pickers
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },

  // Offer card
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 20,
    marginBottom: 16,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },

  offerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    color: '#222',
  },

  offerDetail: {
    fontSize: 16,
    marginBottom: 6,
    color: '#444',
  },

  sectionBox: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
});
