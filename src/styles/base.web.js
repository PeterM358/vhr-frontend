import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  // Brighter semi-transparent overlay
  overlay: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    maxWidth: 900,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',  // <<< Brighter with slight transparency
  },

  // Full background fallback
  background: {
    flex: 1,
    backgroundColor: '#fefefe',  // subtle light fallback
  },

  // Titles
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#111',
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#222',
  },

  // Labels
  label: {
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    fontSize: 16,
    color: '#333',
    alignSelf: 'flex-start',
    maxWidth: 400,
  },

  // Inputs
  formInput: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    fontSize: 16,
  },

  // Buttons
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: 16,
    cursor: 'pointer',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },

  activeTab: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
  },

  inactiveTab: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    color: '#444',
    cursor: 'pointer',
  },

  // List Items
  listItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },

  itemBox: {
    padding: 16,
    borderRadius: 8,
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
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },

  price: {
    color: '#28a745',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    textAlign: 'center',
  },

  picker: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },

  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 20,
    marginBottom: 16,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },

  offerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111',
  },

  offerDetail: {
    fontSize: 16,
    marginBottom: 6,
    color: '#333',
  },

  sectionBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
});