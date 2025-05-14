import React, { useEffect, useState } from "react";
import axios from "axios";
import { List, Button, Modal, message } from "antd";
import AddPropertyModal from "../components/AddPropertyModal";
import PropertyCard from "../components/PropertyCard";
import SearchBar from "../components/SearchBar";
import "./Home.css";
import Header from "../components/Header";

const SHEET_URL = "https://v1.nocodeapi.com/olacay/google_sheets/xbDvLUEbUfpspSwC";

const Home = () => {
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${SHEET_URL}?tabId=Sayfa1`);
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const userData = response.data.data.find(
          (user) => user.username === parsedUser.username
        );
        if (userData) {
          setUser(userData);
        } else {
          message.error("Kullanıcı bilgisi bulunamadı.");
        }
      } else {
        message.error("Giriş yapılmamış.");
      }
    } catch (error) {
      console.error("Kullanıcı bilgisi alınamadı:", error);
      message.error("Kullanıcı bilgisi alınırken hata.");
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${SHEET_URL}?tabId=Sayfa2`);
      const formatted = response.data.data.map((property, index) => ({
        ...property,
        row_id: index + 2, // 1 başlık satırı, 2. satırdan itibaren veri başlıyor
        price: Number(property.price),
        m2: Number(property.m2),
      }));
      setProperties(formatted);
      setFilteredProperties(formatted);
    } catch (error) {
      console.error("İlanlar alınamadı:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchProperties();
  }, []);

  const handleAddProperty = async (newProperty) => {
    try {
      const dataToSend = [
        [
          user?.username || "Bilinmiyor",
          newProperty.title,
          newProperty.price,
          newProperty.m2,
          newProperty.odasayisi,
          newProperty.il,
          newProperty.ilçe,
          newProperty.mahalle,
          newProperty.rentorsale,
          newProperty.balkon,
          newProperty.asansör,
          newProperty.esyali,
          "devam ediyor",
          newProperty.bahce,
          newProperty.otopark,
          newProperty.isitma,
        ],
      ];

      const response = await axios.post(
        `${SHEET_URL}?tabId=Sayfa2`,
        dataToSend,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status === 200) {
        message.success("İlan eklendi!");
        setIsAddModalVisible(false);
        fetchProperties();
      }
    } catch (error) {
      console.error("İlan ekleme hatası:", error);
      message.error("İlan eklenemedi.");
    }
  };

  const handleFilter = (filters) => {
    try {
      const filtered = properties.filter((property) => {
        const matches = (field, value) =>
          value === "Fark Etmez" || property[field]?.toLowerCase() === value.toLowerCase();

        return (
          matches("balkon", filters.balkon) &&
          matches("asansör", filters.asansör) &&
          matches("esyali", filters.esyali) &&
          matches("bahce", filters.bahce) &&
          matches("otopark", filters.otopark) &&
          matches("isitma", filters.isitma) &&
          (filters.title
            ? property.title?.toLowerCase().includes(filters.title.toLowerCase())
            : true) &&
          (filters.priceRange
            ? property.price >= filters.priceRange[0] && property.price <= filters.priceRange[1]
            : true) &&
          (filters.metrekareRange
            ? property.m2 >= filters.metrekareRange[0] && property.m2 <= filters.metrekareRange[1]
            : true) &&
          (filters.odaSayisi ? property.odasayisi === filters.odaSayisi : true) &&
          (filters.il ? property.il?.toLowerCase().includes(filters.il.toLowerCase()) : true) &&
          (filters.ilçe ? property.ilçe?.toLowerCase().includes(filters.ilçe.toLowerCase()) : true) &&
          (filters.mahalle
            ? property.mahalle?.toLowerCase().includes(filters.mahalle.toLowerCase())
            : true) &&
          matches("rentorsale", filters.rentorsale)
        );
      });

      setFilteredProperties(filtered);
    } catch (error) {
      console.error("Filtreleme hatası:", error);
      message.error("Filtreleme sırasında hata.");
    }
  };

  const handleBuyOrRent = async (property) => {
    try {
      const newStatus = property.rentorsale === "Satılık" ? "satıldı" : "kiralandı";
      const rowId = Number(property.row_id || property.rowId);

      if (!rowId) {
        message.error("Geçersiz row ID");
        return;
      }

      await axios.put(
        `${SHEET_URL}?tabId=Sayfa2&row_id=${rowId}`,
        {
          row_id: rowId,
          status: newStatus,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      message.success(`Durum "${newStatus}" olarak güncellendi.`);
      fetchProperties();
    } catch (error) {
      console.error("Durum güncelleme hatası:", error);
      message.error("Durum güncellenirken hata oluştu.");
    }
  };

  const handleDetailsClick = (property) => {
    setSelectedProperty(property);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedProperty(null);
  };

  if (loading) {
    return <p className="loading-text">Yükleniyor...</p>;
  }

  return (
    <div className="home-container">
      <Header username={user?.username || "Misafir"} />
      <h1 className="home-title">Hoş Geldiniz, {user?.username || "Misafir"}!</h1>
      <p className="home-role">Rolünüz: {user?.role || "Belirtilmedi"}</p>
      <SearchBar onFilter={handleFilter} />
      <Button
        type="primary"
        className="add-property-button"
        onClick={() => setIsAddModalVisible(true)}
      >
        Yeni İlan Ekle
      </Button>
      <List
        grid={{ gutter: 16, column: 3 }}
        dataSource={filteredProperties}
        renderItem={(property) => (
          <List.Item>
            <PropertyCard
              property={property}
              onDetailsClick={handleDetailsClick}
              onBuyOrRent={() => handleBuyOrRent(property)}
            />
          </List.Item>
        )}
        className="property-list"
      />
      {selectedProperty && (
        <Modal
          title="İlan Detayları"
          open={isModalVisible}
          onCancel={handleCancel}
          footer={[
            <Button key="close" onClick={handleCancel}>
              Kapat
            </Button>,
          ]}
        >
          {Object.entries(selectedProperty).map(([key, value]) => (
            <p key={key}>
              <strong>{key}:</strong> {value || "Belirtilmedi"}
            </p>
          ))}
        </Modal>
      )}
      {isAddModalVisible && (
        <AddPropertyModal
          visible={isAddModalVisible}
          onCancel={() => setIsAddModalVisible(false)}
          onAdd={handleAddProperty}
        />
      )}
    </div>
  );
};

export default Home;
