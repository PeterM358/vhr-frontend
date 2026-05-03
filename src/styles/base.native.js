// PATH: src/styles/base.native.js
import { StyleSheet } from 'react-native';
import { AppTheme } from './theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },

  background: {
    flex: 1,
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
    maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 20,
    borderRadius: 12,
  },

  contentWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: AppTheme.colors.text,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: AppTheme.colors.text,
  },

  label: {
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
    fontSize: 16,
    textAlign: 'left',
    color: AppTheme.colors.text,
  },

  formInput: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    marginBottom: 16,
  },

  button: {
    backgroundColor: AppTheme.colors.primary,
    paddingVertical: 10,
    borderRadius: AppTheme.roundness,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    marginVertical: 10,
  },

  buttonText: {
    color: AppTheme.colors.surface,
    fontWeight: 'bold',
    fontSize: 16,
  },

  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },

  activeTab: {
    backgroundColor: AppTheme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    borderRadius: AppTheme.roundness,
  },

  inactiveTab: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    borderRadius: AppTheme.roundness,
  },

  listItem: {
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: AppTheme.roundness,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderLeftWidth: 4,
    borderLeftColor: AppTheme.colors.primary,
  },

  itemBox: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.roundness,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 10,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderLeftWidth: 4,
    borderLeftColor: AppTheme.colors.primary,
  },

  subText: {
    fontSize: 15,
    color: AppTheme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  price: {
    color: 'green',
    fontSize: 17,
    fontWeight: 'bold',
    marginVertical: 8,
    textAlign: 'center',
  },

  picker: {
    borderWidth: 1,
    borderColor: AppTheme.colors.placeholder,
    borderRadius: AppTheme.roundness,
    padding: 8,
    marginBottom: 16,
    backgroundColor: AppTheme.colors.surface,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },

  sectionBox: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.roundness + 2,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderLeftWidth: 4,
    borderLeftColor: AppTheme.colors.primary,
  },

  offerCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.roundness + 2,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderLeftWidth: 4,
    borderLeftColor: AppTheme.colors.primary,
  },

  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: AppTheme.colors.text,
  },

  offerDetail: {
    marginBottom: 6,
    fontSize: 14,
    color: AppTheme.colors.text,
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