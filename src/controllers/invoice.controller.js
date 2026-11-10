const { client } = require("../config/db");
const { ObjectId } = require("mongodb");

// নিরাপদ কালেকশন ফাংশন
const getInvoiceCollection = () => {
  return client.db("medfast").collection("invoices");
};

// ======================================
// 1. Get All Invoices
// ======================================
const getAllInvoices = async (req, res) => {
  try {
    const invoiceCollection = getInvoiceCollection();

    const invoices = await invoiceCollection
      .find()
      .sort({ createdAt: -1 })
      .limit(300) // Vercel মেমরি ক্র্যাশ ঠেকাতে সর্বোচ্চ ৩০০ ইনভয়েস
      .toArray();

    return res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error("Get All Invoices Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 2. Get Invoice By ID
// ======================================
const getSingleInvoice = async (req, res) => {
  try {
    const invoiceCollection = getInvoiceCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Invoice ID format",
      });
    }

    const invoice = await invoiceCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error("Get Single Invoice Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 3. Get Customer Invoices
// ======================================
const getCustomerInvoices = async (req, res) => {
  try {
    const invoiceCollection = getInvoiceCollection();
    const email = req.params.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Customer email is required",
      });
    }

    const invoices = await invoiceCollection
      .find({
        customerEmail: email,
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      invoices,
    });
  } catch (error) {
    console.error("Get Customer Invoices Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllInvoices,
  getSingleInvoice,
  getCustomerInvoices,
};
