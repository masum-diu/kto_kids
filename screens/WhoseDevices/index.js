import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WhoseDevices = () => {
  const { width, height } = Dimensions.get("window");
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        <Image
          source={require("../../assets/image1.png")}
          style={[{ width: width * 1, height: height * 0.5 }, styles.mainImage]}
          resizeMode="contain"
        />
        <Image
          source={require("../../assets/image2.png")}
          style={[{ width: width * 0.9, height: 79 }, styles.subImage]}
          resizeMode="contain"
        />
        <Text style={styles.title}>Whose device used?</Text>
      </View>

      {/* <View style={styles.buttonWrapper}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Auth")}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Parents’ devices</Text>
        </TouchableOpacity> */}
      {/* </View> */}

      <View style={styles.buttonWrapper}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("QRCodeScreen")}>
          <Text style={styles.secondaryButtonText}>Kids’ devices</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WhoseDevices;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
  },
  centerContent: {
    alignItems: "center",
  },
  mainImage: {
    marginBottom: 16,
  },
  subImage: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 16,
    color: "#000",
  },
  buttonWrapper: {
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: "#9b1fe8",
    paddingVertical: 12,
    borderRadius: 50,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  secondaryButton: {
    borderColor: "#9b1fe8",
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 50,
  },
  secondaryButtonText: {
    color: "#9b1fe8",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});
