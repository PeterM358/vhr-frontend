// PATH: src/styles/base.web.js
import { StyleSheet } from 'react-native';
import { AppTheme } from './theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },

  background: {
    flex: 1,
    minHeight: '100vh',
  },

  flexFill: {
    flex: 1,
  },

  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  formScreen: {
    padding: 16,
  },

  formScreenScroll: {
    padding: 16,
    paddingBottom: 80,
  },

  centeredScreen: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },

  centeredScreenScroll: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },

  formInputCompact: {
    marginBottom: 12,
  },

  overlay: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    paddingHorizontal: 32,
    paddingVertical: 32,
    borderRadius: 12,
    boxShadow: '0px 6px 24px rgba(0,0,0,0.08)',
    borderWidth: 1,
    borderColor: '#eee',
  },

  contentWrapper: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: AppTheme.colors.text,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: AppTheme.colors.text,
  },

  label: {
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    fontSize: 16,
    color: AppTheme.colors.text,
    alignSelf: 'flex-start',
    maxWidth: 640,
  },

  formInput: {
    marginBottom: 16,
    width: '85%',
    maxWidth: 400,
    alignSelf: 'center',
  },

  button: {
    backgroundColor: AppTheme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: AppTheme.roundness,
    alignItems: 'center',
    width: '60%',
    maxWidth: 480,
    alignSelf: 'center',
    marginBottom: 16,
    cursor: 'pointer',
  },

  buttonText: {
    color: AppTheme.colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },

  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },

  activeTab: {
    backgroundColor: AppTheme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: AppTheme.roundness,
    color: AppTheme.colors.surface,
    cursor: 'pointer',
  },

  inactiveTab: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: AppTheme.roundness,
    color: '#444',
    cursor: 'pointer',
  },

  listItem: {
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: AppTheme.roundness,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: AppTheme.colors.primary,
  },

  itemBox: {
    padding: 16,
    borderRadius: AppTheme.roundness,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
    backgroundColor: AppTheme.colors.surface,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
    borderLeftWidth: 4,
    borderLeftColor: AppTheme.colors.primary,
  },

  subText: {
    fontSize: 16,
    color: AppTheme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  price: {
    color: 'green',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    textAlign: 'center',
  },

  picker: {
    borderWidth: 1,
    borderColor: AppTheme.colors.placeholder,
    borderRadius: AppTheme.roundness,
    padding: 10,
    marginBottom: 16,
    backgroundColor: AppTheme.colors.surface,
    width: '60%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  offerCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.roundness,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 20,
    marginBottom: 16,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: AppTheme.colors.primary,
  },

  offerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    color: AppTheme.colors.text,
  },

  offerDetail: {
    fontSize: 16,
    marginBottom: 6,
    color: AppTheme.colors.text,
  },

  sectionBox: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.roundness,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: AppTheme.colors.primary,
  },

  // LOGIN-SCREEN specific
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },

  loginTitle: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },

  loginError: {
    textAlign: 'center',
    marginBottom: 16,
  },

  loginLoading: {
    marginVertical: 20,
  },

  loginButton: {
    marginVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
    width: '85%',
    maxWidth: 400,
  },

  loginButtonContent: {
    height: 50,
    flexDirection: 'row-reverse',
  },

  loginButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },

  loginSubText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
});